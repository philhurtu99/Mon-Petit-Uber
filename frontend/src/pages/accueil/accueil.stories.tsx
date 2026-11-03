import type { Meta, StoryObj } from '@storybook/react';

import Accueil from './accueil';

const meta: Meta<typeof Accueil> = {
  component: Accueil,
  title: 'Components/Accueil',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Accueil>;

export const Default: Story = {
  args: {},
};

export const WithCustomProp: Story = {
  args: {
    prop: 'Contenu personnalisé',
  },
};
