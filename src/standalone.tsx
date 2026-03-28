import React from 'react';
import ReactDOM from 'react-dom/client';

import CioCheckoutComponent from './app';
import type { CioCheckoutProps } from './types';
import version from './version';

import './styles.css';

export interface CioCheckoutInitOptions extends CioCheckoutProps {
  /** CSS selector for the container element */
  selector: string;
  /** Whether to include default CSS styles (default: true) */
  includeCSS?: boolean;
}

const CioCheckout = (() => {
  const instances = new Map<
    Element,
    {
      root: ReactDOM.Root;
      currentProps: CioCheckoutProps;
    }
  >();

  function handleStylesheet(includeCSS: boolean): void {
    const styleId = 'cio-checkout-styles';
    const stylesheet = document.getElementById(styleId) as HTMLStyleElement | null;
    if (stylesheet) {
      stylesheet.disabled = !includeCSS;
    }
  }

  return {
    VERSION: version || '0.1.0',

    init({ selector, includeCSS = true, ...componentProps }: CioCheckoutInitOptions): Element | undefined {
      if (typeof document === 'undefined') {
        console.error('CioCheckout.init() requires a browser environment');
        return undefined;
      }

      const container = document.querySelector<HTMLElement>(selector);
      if (!container) {
        console.error(`CioCheckout.init(): Element not found for selector "${selector}"`);
        return undefined;
      }

      handleStylesheet(includeCSS);

      const existingInstance = instances.get(container);
      if (existingInstance) {
        existingInstance.root.unmount();
        instances.delete(container);
      }

      try {
        const root = ReactDOM.createRoot(container);
        instances.set(container, { root, currentProps: componentProps });

        root.render(
          <React.StrictMode>
            <CioCheckoutComponent {...componentProps} />
          </React.StrictMode>
        );

        return container;
      } catch (error) {
        console.error('CioCheckout.init(): Failed to render', error);
        return undefined;
      }
    },

    update(selector: string, newProps: Partial<CioCheckoutProps>): void {
      if (typeof document === 'undefined') return;

      const container = document.querySelector<HTMLElement>(selector);
      if (!container) {
        console.error(`CioCheckout.update(): Element not found for selector "${selector}"`);
        return;
      }

      const instance = instances.get(container);
      if (!instance) {
        console.warn(`CioCheckout.update(): No instance found for selector "${selector}"`);
        return;
      }

      const mergedProps = { ...instance.currentProps, ...newProps } as CioCheckoutProps;
      instance.currentProps = mergedProps;

      instance.root.render(
        <React.StrictMode>
          <CioCheckoutComponent {...mergedProps} />
        </React.StrictMode>
      );
    },

    destroy(selector?: string): void {
      if (typeof document === 'undefined') return;

      if (selector) {
        const container = document.querySelector<HTMLElement>(selector);
        if (container) {
          const instance = instances.get(container);
          if (instance) {
            instance.root.unmount();
            instances.delete(container);
          }
        }
      } else {
        instances.forEach((instance) => instance.root.unmount());
        instances.clear();
      }
    },
  };
})();

export default CioCheckout;
