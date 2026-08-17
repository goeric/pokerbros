import { render, screen } from '@testing-library/react';
import React from 'react';
import GameStatusMessage from '@/app/game/[id]/components/GameStatusMessage';

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
}));

jest.mock('@/app/game/[id]/actions', () => ({
  startGame: jest.fn(),
  deleteGame: jest.fn(),
}));

const baseGame = {
  id: '309dd2be-c80a-4933-8746-8a389a33c1fe',
  date: '2026-04-01',
  time: '19:00',
  buyIn: 100,
  venue: 'Poker Room',
  status: 'in_progress' as const,
  calendar_sequence: 0,
  createdAt: '2026-04-01T00:00:00.000Z',
};

describe('GameStatusMessage', () => {
  it('shows a delete action for admins on in-progress games', () => {
    render(<GameStatusMessage game={baseGame} isAdmin={true} onEdit={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Delete Game' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to Live Tracker' })).toBeTruthy();
  });

  it('does not show a delete action for non-admins on in-progress games', () => {
    render(<GameStatusMessage game={baseGame} isAdmin={false} onEdit={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Delete Game' })).toBeNull();
  });
});
