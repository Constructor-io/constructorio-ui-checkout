import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

const theme = create({
  base: 'light',
  brandTitle: 'Constructor',
  brandUrl: 'https://github.com/Constructor-io/constructorio-ui-checkout',
  brandImage:
    'https://constructor.com/hubfs/Website%20-%202024/Logos/Logo-black.svg',
  brandTarget: '_blank',
});

addons.setConfig({
  theme,
});
