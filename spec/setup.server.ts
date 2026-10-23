import { afterEach } from 'vitest';
import failOnConsole from 'vitest-fail-on-console';

afterEach(() => {
  vi.clearAllMocks();
});

failOnConsole();
