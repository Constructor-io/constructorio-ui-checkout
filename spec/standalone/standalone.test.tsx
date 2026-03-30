import { act } from '@testing-library/react';

import {
  DEMO_CLIENT_SECRET,
  DEMO_PUBLISHABLE_KEY,
} from '@spec/__tests__/constants';

import checkoutRegistry from '@src/registry/CheckoutRegistry';
import CioCheckout from '@src/standalone';

const SESSION = {
  clientSecret: DEMO_CLIENT_SECRET,
  publishableKey: DEMO_PUBLISHABLE_KEY,
};

describe('CioCheckout standalone API', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'checkout';
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      CioCheckout.destroy();
    });
    checkoutRegistry.clear();
    document.body.innerHTML = '';
  });

  describe('VERSION', () => {
    it('exposes a version string', () => {
      expect(typeof CioCheckout.VERSION).toBe('string');
      expect(CioCheckout.VERSION.length).toBeGreaterThan(0);
    });
  });

  describe('init', () => {
    it('renders into the target selector and returns the container', () => {
      let result: Element | undefined;
      act(() => {
        result = CioCheckout.init({
          selector: '#checkout',
          session: SESSION,
        });
      });

      expect(result).toBe(container);
      expect(container.innerHTML).not.toBe('');
    });

    it('returns undefined when selector does not match an element', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = CioCheckout.init({
        selector: '#nonexistent',
        session: SESSION,
      });

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Element not found')
      );
      errorSpy.mockRestore();
    });

    it('re-initializes when called on the same selector', () => {
      let result: Element | undefined;
      act(() => {
        CioCheckout.init({ selector: '#checkout', session: SESSION });
        result = CioCheckout.init({ selector: '#checkout', session: SESSION });
      });

      expect(result).toBe(container);
    });
  });

  describe('update', () => {
    it('updates props on an existing instance', () => {
      act(() => {
        CioCheckout.init({ selector: '#checkout', session: SESSION });
      });
      expect(() => {
        act(() => {
          CioCheckout.update('#checkout', { triggerLabel: 'Buy Now' });
        });
      }).not.toThrow();
    });

    it('warns when no instance exists for the selector', () => {
      act(() => {
        CioCheckout.init({ selector: '#checkout', session: SESSION });
      });

      const other = document.createElement('div');
      other.id = 'other';
      document.body.appendChild(other);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      CioCheckout.update('#other', {});

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No instance found')
      );
      warnSpy.mockRestore();
    });

    it('errors when element not found', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      CioCheckout.update('#nonexistent', {});

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Element not found')
      );
      errorSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('destroys a specific instance by selector', () => {
      act(() => {
        CioCheckout.init({ selector: '#checkout', session: SESSION });
      });
      act(() => {
        CioCheckout.destroy('#checkout');
      });

      expect(container.innerHTML).toBe('');
    });

    it('destroys all instances when no selector is given', () => {
      const container2 = document.createElement('div');
      container2.id = 'checkout2';
      document.body.appendChild(container2);

      act(() => {
        CioCheckout.init({ selector: '#checkout', session: SESSION });
        CioCheckout.init({ selector: '#checkout2', session: SESSION });
      });
      act(() => {
        CioCheckout.destroy();
      });

      expect(container.innerHTML).toBe('');
      expect(container2.innerHTML).toBe('');
    });

    it('does nothing for an unknown selector', () => {
      act(() => {
        CioCheckout.init({ selector: '#checkout', session: SESSION });
      });
      expect(() => {
        CioCheckout.destroy('#nonexistent');
      }).not.toThrow();
      expect(container.innerHTML).not.toBe('');
    });
  });

  describe('register / isRegistered', () => {
    it('registers a static session', () => {
      expect(CioCheckout.isRegistered()).toBe(false);
      CioCheckout.register(SESSION);
      expect(CioCheckout.isRegistered()).toBe(true);
    });

    it('registers an async session function', () => {
      CioCheckout.register(() => Promise.resolve(SESSION));
      expect(CioCheckout.isRegistered()).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears the registry', () => {
      CioCheckout.register(SESSION);
      expect(CioCheckout.isRegistered()).toBe(true);

      act(() => {
        CioCheckout.reset();
      });
      expect(CioCheckout.isRegistered()).toBe(false);
    });

    it('does not throw when no instances exist', () => {
      expect(() => CioCheckout.reset()).not.toThrow();
    });
  });
});
