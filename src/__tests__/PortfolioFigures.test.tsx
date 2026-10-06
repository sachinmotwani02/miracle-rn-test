import React from 'react';
import { render } from '@testing-library/react-native';
import { PortfolioFigures } from '../components/PortfolioFigures';

const portfolio = { valueUsd: 12057.7, deltaUsd: 64.2, deltaPct: 0.54 };

describe('PortfolioFigures', () => {
  it('shows the loaded figures', async () => {
    const screen = await render(<PortfolioFigures portfolio={portfolio} />);
    expect(screen.getByText('$12,057.70')).toBeTruthy();
    expect(screen.getByText('+$64.20 · 0.54% 24h')).toBeTruthy();
  });

  it('signs a loss', async () => {
    const screen = await render(<PortfolioFigures portfolio={{ valueUsd: 11900.25, deltaUsd: -93.25, deltaPct: -0.78 }} />);
    expect(screen.getByText('-$93.25 · 0.78% 24h')).toBeTruthy();
  });
});
