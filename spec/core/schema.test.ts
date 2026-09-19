import { validateFlowState } from '@src/core/schema';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';

const validState = () => ({
  currentStepId: 'a' as string | null,
  completedStepIds: [] as string[],
  cartSnapshot: [] as unknown[],
  currency: null as string | null,
  sessionId: null as string | null,
  sessionStatus: 'idle',
  metadata: {},
  schemaVersion: FLOW_SCHEMA_VERSION,
});

describe(`${validateFlowState.name}: client`, () => {
  describe('happy path', () => {
    it('accepts a minimal valid state', () => {
      expect(validateFlowState(validState())).not.toBeNull();
    });

    it('accepts null currentStepId', () => {
      const s = validState();
      s.currentStepId = null;
      expect(validateFlowState(s)).not.toBeNull();
    });

    it('accepts completed step ids as an array of strings', () => {
      const s = validState();
      s.completedStepIds = ['x', 'y'];
      expect(validateFlowState(s)).not.toBeNull();
    });

    it('accepts each valid sessionStatus', () => {
      for (const status of ['idle', 'creating', 'active', 'expired', 'error']) {
        const s = validState();
        s.sessionStatus = status;
        expect(validateFlowState(s)).not.toBeNull();
      }
    });

    it('accepts a currency string', () => {
      const s = validState();
      s.currency = 'USD';
      expect(validateFlowState(s)).not.toBeNull();
    });
  });

  describe('rejections', () => {
    it('rejects non-object input', () => {
      expect(validateFlowState(null)).toBeNull();
      expect(validateFlowState('string')).toBeNull();
      expect(validateFlowState(42)).toBeNull();
      expect(validateFlowState([])).toBeNull();
    });

    it('rejects wrong schemaVersion', () => {
      const s = validState();
      s.schemaVersion = 99 as unknown as typeof FLOW_SCHEMA_VERSION;
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects currentStepId that is neither string nor null', () => {
      const s = validState();
      (s as unknown as Record<string, unknown>).currentStepId = 42;
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects completedStepIds with non-string items', () => {
      const s = validState();
      (s as unknown as Record<string, unknown>).completedStepIds = ['a', 42];
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects cartSnapshot that is not an array', () => {
      const s = validState();
      (s as unknown as Record<string, unknown>).cartSnapshot = 'no';
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects unknown sessionStatus', () => {
      const s = validState();
      s.sessionStatus = 'nope';
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects non-object metadata', () => {
      const s = validState();
      (s as unknown as Record<string, unknown>).metadata = 'no';
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects sessionId that is neither string nor null', () => {
      const s = validState();
      (s as unknown as Record<string, unknown>).sessionId = 42;
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects currency that is neither string nor null', () => {
      const s = validState();
      (s as unknown as Record<string, unknown>).currency = 42;
      expect(validateFlowState(s)).toBeNull();
    });
  });

  describe('cart item validation', () => {
    it('accepts items that are plain objects', () => {
      const s = validState();
      s.cartSnapshot = [{ id: 'a', name: 'A', unitAmount: 10, quantity: 1 }];
      expect(validateFlowState(s)).not.toBeNull();
    });

    it('accepts any plain-object shape (consumer owns item shape)', () => {
      const s = validState();
      s.cartSnapshot = [{ sku: 'x', title: 'X', priceCents: 100, qty: 2 }];
      expect(validateFlowState(s)).not.toBeNull();
    });

    it('rejects when an item is not a plain object', () => {
      const s = validState();
      s.cartSnapshot = [null, { id: 'b' }];
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects when an item is an array', () => {
      const s = validState();
      s.cartSnapshot = [['a', 'b']];
      expect(validateFlowState(s)).toBeNull();
    });
  });
});
