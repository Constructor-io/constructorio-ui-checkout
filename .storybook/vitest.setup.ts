import { setProjectAnnotations } from '@storybook/react-vite';
import { beforeAll } from 'vitest';

import * as preview from './preview';

// Registers Storybook globals/decorators so stories render the same way in
// vitest as they do in the running Storybook UI.
const project = setProjectAnnotations([preview]);

beforeAll(project.beforeAll);
