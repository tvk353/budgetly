import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HomePage from './page';

describe('HomePage', () => {
  it('renders the Budgetly login screen', () => {
    render(<HomePage />);

    expect(screen.getByText('Budgetly')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /log in to your workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });
});
