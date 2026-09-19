import '@testing-library/jest-dom/vitest';
import failOnConsole from 'vitest-fail-on-console';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// React 18 requires this for act() warnings
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does not implement showModal/close natively
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement
  ) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

failOnConsole();
