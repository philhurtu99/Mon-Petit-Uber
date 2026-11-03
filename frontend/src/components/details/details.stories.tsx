import React from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import {details} from './details';

const meta: Meta<typeof details> = {
  component: details,
};

export default meta;

type Story = StoryObj<typeof details>;

export const Basic: Story = {args: {}};
