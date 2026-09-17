import { validateFlowState } from '@src/core/schema';
import { FLOW_SCHEMA_VERSION } from '@src/core/types';

const validState = () => ({
  currentStepId: 'a' as string | null,
  completedStepIds: [] as string[],
  cartSnapshot: [] as unknown[],
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
  });

  describe('cart item validation', () => {
    it('accepts a valid cart item', () => {
      const s = validState();
      s.cartSnapshot = [{ name: 'A', amount: 10, quantity: 1 }];
      expect(validateFlowState(s)).not.toBeNull();
    });

    it('accepts items with optional string fields', () => {
      const s = validState();
      s.cartSnapshot = [
        {
          name: 'A',
          amount: 10,
          currencySign: '$',
          priceId: 'price_x',
          imageUrl: 'https://x/y.png',
        },
      ];
      expect(validateFlowState(s)).not.toBeNull();
    });

    it('rejects a cart item missing name', () => {
      const s = validState();
      s.cartSnapshot = [{ amount: 10 }];
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects a cart item missing amount', () => {
      const s = validState();
      s.cartSnapshot = [{ name: 'A' }];
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects a cart item with non-finite amount (NaN)', () => {
      const s = validState();
      s.cartSnapshot = [{ name: 'A', amount: NaN }];
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects a cart item with non-finite quantity', () => {
      const s = validState();
      s.cartSnapshot = [{ name: 'A', amount: 10, quantity: Infinity }];
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects a cart item with a non-string optional field', () => {
      const s = validState();
      s.cartSnapshot = [{ name: 'A', amount: 10, priceId: 42 }];
      expect(validateFlowState(s)).toBeNull();
    });

    it('rejects when any single item fails validation', () => {
      const s = validState();
      s.cartSnapshot = [{ name: 'A', amount: 10 }, { name: 'B' }];
      expect(validateFlowState(s)).toBeNull();
    });
  });
});
