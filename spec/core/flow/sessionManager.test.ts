import { makeCtx } from '@spec/factory/flowCtx';

import { createSessionManager } from '@src/core/flow/sessionManager';
import type { SessionUpdatePatch } from '@src/core/types';
import type { CheckoutSessionResponse } from '@src/types';

const goodResponse = (id = 'cs_test_abc'): CheckoutSessionResponse => ({
  clientSecret: `${id}_secret_xyz`,
  publishableKey: 'pk_test',
});

describe(`${createSessionManager.name}: client`, () => {
  describe('createSession', () => {
    it('calls onCreateSession and sets session on success', async () => {
      const onCreateSession = vi.fn(() => Promise.resolve(goodResponse()));
      const { ctx } = makeCtx({ config: { onCreateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const result = await sm.createSession();
      expect(result?.clientSecret).toContain('cs_test_abc');
      expect(sm.getSession()).toEqual(result);
      expect(ctx.store.getState().sessionStatus).toBe('active');
    });

    it('coalesces concurrent calls to a single request', async () => {
      const onCreateSession = vi.fn(() => Promise.resolve(goodResponse()));
      const { ctx } = makeCtx({ config: { onCreateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const [a, b] = await Promise.all([
        sm.createSession(),
        sm.createSession(),
      ]);
      expect(onCreateSession).toHaveBeenCalledTimes(1);
      expect(a).toBe(b);
    });

    it('returns the cached session on subsequent calls', async () => {
      const onCreateSession = vi.fn(() => Promise.resolve(goodResponse()));
      const { ctx } = makeCtx({ config: { onCreateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      await sm.createSession();
      expect(onCreateSession).toHaveBeenCalledTimes(1);
    });

    it('emits session.create error when onCreateSession rejects', async () => {
      const { ctx, events } = makeCtx({
        config: { onCreateSession: () => Promise.reject(new Error('boom')) },
      });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const result = await sm.createSession();
      expect(result).toBeNull();
      expect(ctx.store.getState().sessionStatus).toBe('error');
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'session.create' })
      );
    });

    it('emits error when onCreateSession returns invalid shape', async () => {
      const { ctx, events } = makeCtx({
        config: {
          onCreateSession: () =>
            Promise.resolve({
              wrong: true,
            } as unknown as CheckoutSessionResponse),
        },
      });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const result = await sm.createSession();
      expect(result).toBeNull();
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'session.create' })
      );
    });

    it('fires onSessionActive callback after successful creation', async () => {
      const { ctx } = makeCtx({
        config: { onCreateSession: () => Promise.resolve(goodResponse()) },
      });
      const onSessionActive = vi.fn();
      const sm = createSessionManager(ctx, { onSessionActive });
      await sm.createSession();
      expect(onSessionActive).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSession', () => {
    it('emits error when onUpdateSession is not configured', async () => {
      const { ctx, events } = makeCtx();
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      const result = await sm.updateSession({ metadata: {} });
      expect(result).toBeNull();
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'session.update' })
      );
    });

    it('emits error when called before createSession', async () => {
      const onUpdateSession = vi.fn(() =>
        Promise.resolve(goodResponse('cs_test_upd'))
      );
      const { ctx, events } = makeCtx({ config: { onUpdateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const result = await sm.updateSession({ metadata: {} });
      expect(result).toBeNull();
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'session.update' })
      );
    });

    it('serializes queued updates in FIFO order', async () => {
      const calls: string[] = [];
      const onUpdateSession = vi.fn((patch: SessionUpdatePatch) => {
        calls.push((patch.metadata?.tag as string | undefined) ?? '');
        return Promise.resolve(goodResponse());
      });
      const { ctx } = makeCtx({ config: { onUpdateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      await Promise.all([
        sm.updateSession({ metadata: { tag: '1' } }),
        sm.updateSession({ metadata: { tag: '2' } }),
        sm.updateSession({ metadata: { tag: '3' } }),
      ]);
      expect(calls).toEqual(['1', '2', '3']);
    });

    it('emits session.updated event with a diff when items change', async () => {
      const onUpdateSession = vi.fn(() =>
        Promise.resolve(goodResponse('cs_test_upd'))
      );
      const { ctx, events } = makeCtx({ config: { onUpdateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      await sm.updateSession({
        items: [{ name: 'X', amount: 10 }],
        reason: 'items',
      });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'session.updated',
          reason: 'items',
        })
      );
    });

    it('emits error when onUpdateSession returns invalid shape', async () => {
      const { ctx, events } = makeCtx({
        config: {
          onUpdateSession: () =>
            Promise.resolve({
              bad: true,
            } as unknown as CheckoutSessionResponse),
        },
      });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      await sm.updateSession({ metadata: {} });
      expect(events).toContainEqual(
        expect.objectContaining({ source: 'session.update' })
      );
    });
  });

  describe('markExpired', () => {
    it('is a no-op when no session exists', () => {
      const { ctx, events } = makeCtx();
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      sm.markExpired();
      expect(sm.getSession()).toBeNull();
      expect(events.filter((e) => e.type === 'session.expired')).toHaveLength(
        0
      );
    });

    it('invalidates the session, sets status to expired, and emits session.expired', async () => {
      const { ctx, events } = makeCtx({
        config: { onCreateSession: () => Promise.resolve(goodResponse()) },
      });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      sm.markExpired();
      expect(sm.getSession()).toBeNull();
      expect(ctx.store.getState().sessionStatus).toBe('expired');
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'session.expired' })
      );
    });
  });

  describe('recreate', () => {
    it('invalidates and re-creates, emitting session.recreated with old + new ids', async () => {
      let call = 0;
      const onCreateSession = vi.fn(() => {
        call += 1;
        return Promise.resolve(goodResponse(`cs_test_v${call}`));
      });
      const { ctx, events } = makeCtx({ config: { onCreateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      await sm.recreate();
      expect(onCreateSession).toHaveBeenCalledTimes(2);
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'session.recreated',
          oldSessionId: 'cs_test_v1',
          newSessionId: 'cs_test_v2',
        })
      );
    });
  });

  describe('drainQueue', () => {
    it('resolves queued (not-yet-running) updates with null', async () => {
      let resolveFirst: (v: CheckoutSessionResponse) => void = () => {};
      const onUpdateSession = vi.fn(
        () =>
          new Promise<CheckoutSessionResponse>((resolve) => {
            resolveFirst = resolve;
          })
      );
      const { ctx } = makeCtx({ config: { onUpdateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      void sm.updateSession({ metadata: { i: 1 } });
      const queued2 = sm.updateSession({ metadata: { i: 2 } });
      const queued3 = sm.updateSession({ metadata: { i: 3 } });
      sm.drainQueue();
      resolveFirst(goodResponse());
      await expect(queued2).resolves.toBeNull();
      await expect(queued3).resolves.toBeNull();
    });
  });

  describe('destroy-mid-flight guards', () => {
    it('drops createSession response when destroyed mid-flight', async () => {
      let resolveCreate: (r: CheckoutSessionResponse) => void = () => {};
      const onCreateSession = vi.fn(
        () =>
          new Promise<CheckoutSessionResponse>((resolve) => {
            resolveCreate = resolve;
          })
      );
      const { ctx, setDestroyed } = makeCtx({ config: { onCreateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      const p = sm.createSession();
      setDestroyed(true);
      resolveCreate(goodResponse());
      expect(await p).toBeNull();
      expect(sm.getSession()).toBeNull();
    });

    it('drops updateSession response when destroyed mid-flight', async () => {
      let resolveUpdate: (r: CheckoutSessionResponse) => void = () => {};
      const onUpdateSession = vi.fn(
        () =>
          new Promise<CheckoutSessionResponse>((resolve) => {
            resolveUpdate = resolve;
          })
      );
      const { ctx, setDestroyed } = makeCtx({ config: { onUpdateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      const p = sm.updateSession({ metadata: {} });
      setDestroyed(true);
      resolveUpdate(goodResponse('cs_test_updated'));
      expect(await p).toBeNull();
    });

    it('recreate returns null when destroyed mid-flight', async () => {
      let resolveSecond: (r: CheckoutSessionResponse) => void = () => {};
      let call = 0;
      const onCreateSession = vi.fn(() => {
        call += 1;
        if (call === 1) return Promise.resolve(goodResponse('cs_v1'));
        return new Promise<CheckoutSessionResponse>((resolve) => {
          resolveSecond = resolve;
        });
      });
      const { ctx, setDestroyed } = makeCtx({ config: { onCreateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      const p = sm.recreate();
      setDestroyed(true);
      resolveSecond(goodResponse('cs_v2'));
      expect(await p).toBeNull();
    });

    it('updateSession rejects errors after destroy', async () => {
      const onUpdateSession = vi.fn(() => Promise.reject(new Error('boom')));
      const { ctx, setDestroyed } = makeCtx({ config: { onUpdateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      const p = sm.updateSession({ metadata: {} });
      setDestroyed(true);
      expect(await p).toBeNull();
    });
  });

  describe('null-sessionId branches', () => {
    it('markExpired does not emit session.expired when clientSecret has no id', async () => {
      const badResponse: CheckoutSessionResponse = {
        clientSecret: '_secret_leading',
        publishableKey: 'pk_test',
      };
      const { ctx, events } = makeCtx({
        config: { onCreateSession: () => Promise.resolve(badResponse) },
      });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      sm.markExpired();
      expect(
        events.filter((e) => e.type === 'session.expired')
      ).toHaveLength(0);
      expect(ctx.store.getState().sessionStatus).toBe('expired');
    });

    it('recreate does not emit session.recreated when new clientSecret has no id', async () => {
      const badResponse: CheckoutSessionResponse = {
        clientSecret: '_secret_bad',
        publishableKey: 'pk_test',
      };
      let call = 0;
      const onCreateSession = vi.fn(() => {
        call += 1;
        return Promise.resolve(
          call === 1 ? goodResponse('cs_v1') : badResponse
        );
      });
      const { ctx, events } = makeCtx({ config: { onCreateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      await sm.recreate();
      expect(
        events.filter((e) => e.type === 'session.recreated')
      ).toHaveLength(0);
    });

    it('createSession does not emit session.created when clientSecret has no id', async () => {
      const badResponse: CheckoutSessionResponse = {
        clientSecret: '_secret_bad',
        publishableKey: 'pk_test',
      };
      const { ctx, events } = makeCtx({
        config: { onCreateSession: () => Promise.resolve(badResponse) },
      });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      expect(
        events.filter((e) => e.type === 'session.created')
      ).toHaveLength(0);
      expect(ctx.store.getState().sessionStatus).toBe('active');
    });
  });

  describe('reset', () => {
    it('clears the session and drains still-queued updates', async () => {
      let firstResolve: (v: CheckoutSessionResponse) => void = () => {};
      const onUpdateSession = vi.fn(
        () =>
          new Promise<CheckoutSessionResponse>((resolve) => {
            firstResolve = resolve;
          })
      );
      const { ctx } = makeCtx({ config: { onUpdateSession } });
      const sm = createSessionManager(ctx, {
        onSessionActive: () => undefined,
      });
      await sm.createSession();
      void sm.updateSession({ metadata: { tag: 'first' } });
      const queued = sm.updateSession({ metadata: { tag: 'second' } });
      sm.reset();
      firstResolve(goodResponse('cs_test_first_done'));
      expect(sm.getSession()).toBeNull();
      expect(await queued).toBeNull();
    });
  });
});
