import type { BaseCartItem } from '@src/types';

import type { CheckoutStepId } from '../types';

import type { FlowContext } from './context';
import { createGuards } from './guards';
import { findStepIndex, toError } from './helpers';
import type { createRouterBridge } from './routerBridge';
import type { createStorageManager } from './storageManager';

export function createNavigator<
  TProvider extends string = string,
  TState = unknown,
  TItem = BaseCartItem,
>(
  ctx: FlowContext<TProvider, TState, TItem>,
  storage: ReturnType<typeof createStorageManager<TProvider, TState, TItem>>,
  router: ReturnType<typeof createRouterBridge<TProvider, TState, TItem>>
) {
  const { config, steps, store, isDestroyed, events, emitError } = ctx;
  const { runGuard, findFirstFailingGuard } = createGuards(ctx);

  let navVersion = 0;

  const enterStep = (stepId: CheckoutStepId, from: CheckoutStepId | null) => {
    store.setState((prev) => ({ ...prev, currentStepId: stepId }));
    events.emit({ type: 'step.entered', stepId, from });
    const step = steps[findStepIndex(steps, stepId)];
    if (step) router.push(step.path);
  };

  const exitStep = (stepId: CheckoutStepId, to: CheckoutStepId | null) => {
    events.emit({ type: 'step.exited', stepId, to });
    store.setState((prev) => {
      if (prev.completedStepIds.includes(stepId)) return prev;
      return {
        ...prev,
        completedStepIds: [...prev.completedStepIds, stepId],
      };
    });
  };

  const complete = (): void => {
    if (isDestroyed()) return;
    events.emit({ type: 'flow.completed' });
  };

  const validateAndEnterResumedStep = async (): Promise<void> => {
    const resumedStepId = store.getState().currentStepId;
    if (resumedStepId === null) return;
    const resumedIdx = findStepIndex(steps, resumedStepId);
    const failIdx = await findFirstFailingGuard(0, resumedIdx);
    if (isDestroyed()) return;
    if (failIdx === null) {
      events.emit({ type: 'step.entered', stepId: resumedStepId, from: null });
      const resumedStep = steps[resumedIdx];
      if (resumedStep) router.push(resumedStep.path);
      return;
    }
    const failedStep = steps[failIdx];
    emitError(
      'guard',
      new Error(
        failIdx === resumedIdx
          ? `resume: guard for "${failedStep.id}" rejected`
          : `resume: prerequisite step "${failedStep.id}" guard rejected before "${resumedStepId}"`
      )
    );
    store.setState((prev) => ({
      ...prev,
      currentStepId: failedStep.id,
      completedStepIds: prev.completedStepIds.filter(
        (id) => findStepIndex(steps, id) < failIdx
      ),
    }));
    events.emit({ type: 'step.entered', stepId: failedStep.id, from: null });
    router.push(failedStep.path);
  };

  let startInFlight: Promise<void> | null = null;
  const start = (): Promise<void> => {
    if (isDestroyed()) return Promise.resolve();
    if (startInFlight) return startInFlight;
    if (store.getState().currentStepId !== null) return Promise.resolve();
    startInFlight = runStart().finally(() => {
      startInFlight = null;
    });
    return startInFlight;
  };

  const runStart = async (): Promise<void> => {
    if (isDestroyed()) return;
    if (store.getState().currentStepId !== null) return;

    if (config.authenticate) {
      try {
        const result = await config.authenticate();
        if (isDestroyed()) return;
        if (result === null) {
          emitError(
            'authenticate',
            new Error('authenticate: rejected — flow not started')
          );
          return;
        }
      } catch (reason) {
        if (isDestroyed()) return;
        emitError('authenticate', toError(reason));
        return;
      }
    }

    const resumed = await storage.maybeAutoResume();
    if (resumed) {
      await validateAndEnterResumedStep();
      return;
    }

    if (router.hasRouter) {
      const currentPath = router.getCurrentPath();
      const matched = router.findStepByPath(currentPath);
      if (matched) {
        const matchedIdx = findStepIndex(steps, matched.id);
        const failIdx = await findFirstFailingGuard(0, matchedIdx);
        if (isDestroyed()) return;
        if (failIdx === null) {
          events.emit({ type: 'flow.started' });
          enterStep(matched.id, null);
          return;
        }
        const failedStep = steps[failIdx];
        emitError(
          'guard',
          new Error(
            failIdx === matchedIdx
              ? `start: guard for "${matched.id}" rejected`
              : `start: prerequisite step "${failedStep.id}" guard rejected before "${matched.id}"`
          )
        );
        return;
      }
    }

    const first = steps[0];
    const guardOk = await runGuard(first);
    if (!guardOk) return;

    events.emit({ type: 'flow.started' });
    enterStep(first.id, null);
  };

  const next = async (opts?: { skip?: boolean }): Promise<void> => {
    if (isDestroyed()) return;
    const state = store.getState();
    if (state.currentStepId === null) {
      await start();
      return;
    }

    const idx = findStepIndex(steps, state.currentStepId);
    const current = steps[idx];
    if (opts?.skip && !current.optional) {
      emitError(
        'guard',
        new Error(`Cannot skip required step "${current.id}"`)
      );
      return;
    }

    const nextIdx = idx + 1;
    if (nextIdx >= steps.length) {
      navVersion += 1;
      exitStep(current.id, null);
      complete();
      return;
    }

    const nextStep = steps[nextIdx];
    const myVersion = ++navVersion;
    const guardOk = await runGuard(nextStep);
    if (!guardOk) return;
    if (isDestroyed()) return;
    if (myVersion !== navVersion) return;
    if (store.getState().currentStepId !== current.id) return;

    exitStep(current.id, nextStep.id);
    enterStep(nextStep.id, current.id);
  };

  const back = (): Promise<void> => {
    if (isDestroyed()) return Promise.resolve();
    const state = store.getState();
    if (state.currentStepId === null) return Promise.resolve();
    const idx = findStepIndex(steps, state.currentStepId);
    if (idx <= 0) return Promise.resolve();
    const prevStep = steps[idx - 1];
    const current = steps[idx];
    navVersion += 1;
    events.emit({ type: 'step.exited', stepId: current.id, to: prevStep.id });
    store.setState((prev) => ({
      ...prev,
      completedStepIds: prev.completedStepIds.filter(
        (id) => id !== prevStep.id
      ),
    }));
    enterStep(prevStep.id, current.id);
    return Promise.resolve();
  };

  const goTo = async (stepId: CheckoutStepId): Promise<void> => {
    if (isDestroyed()) return;
    const targetIdx = findStepIndex(steps, stepId);
    if (targetIdx === -1) {
      emitError('guard', new Error(`Unknown step id "${stepId}"`));
      return;
    }
    const from = store.getState().currentStepId;
    if (from === stepId) return;
    const fromIdx = from === null ? -1 : findStepIndex(steps, from);

    const guardStart = fromIdx < targetIdx ? fromIdx + 1 : targetIdx;
    const myVersion = ++navVersion;
    const failIdx = await findFirstFailingGuard(guardStart, targetIdx);
    if (isDestroyed()) return;
    if (myVersion !== navVersion) return;
    if (failIdx !== null) {
      const failedStep = steps[failIdx];
      emitError(
        'guard',
        new Error(
          failIdx === targetIdx
            ? `goTo("${stepId}"): guard rejected`
            : `goTo("${stepId}"): prerequisite step "${failedStep.id}" guard rejected`
        )
      );
      return;
    }

    const currentFrom = store.getState().currentStepId;
    if (currentFrom === stepId) return;
    const currentFromIdx =
      currentFrom === null ? -1 : findStepIndex(steps, currentFrom);
    if (currentFrom !== null) {
      if (targetIdx > currentFromIdx) {
        for (let i = currentFromIdx; i < targetIdx; i += 1) {
          exitStep(steps[i].id, steps[i + 1].id);
        }
      } else {
        events.emit({ type: 'step.exited', stepId: currentFrom, to: stepId });
        store.setState((prev) => ({
          ...prev,
          completedStepIds: prev.completedStepIds.filter((id) => id !== stepId),
        }));
      }
    } else {
      events.emit({ type: 'flow.started' });
    }
    enterStep(stepId, currentFrom);
  };

  return {
    start,
    next,
    back,
    goTo,
    complete,
  };
}

export type Navigator = ReturnType<typeof createNavigator>;
