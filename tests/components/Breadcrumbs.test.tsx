import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from '@/components/Breadcrumbs';

describe('Breadcrumbs', () => {
  const path = [
    { id: 'g1', tool: 'group', name: '组一' },
    { id: 'g2', tool: 'group', name: '组二' },
  ] as any[];

  it('renders items and handles clicks', async () => {
    const user = userEvent.setup();
    const onJumpTo = vi.fn();
    render(<Breadcrumbs path={path} onJumpTo={onJumpTo} />);

    // two items appear
    expect(screen.getByRole('button', { name: '组一' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '组二' })).toBeInTheDocument();

    // click second item
    await user.click(screen.getByRole('button', { name: '组二' }));
    expect(onJumpTo).toHaveBeenCalledWith(1);
  });
});
