import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockUnsubscribe = jest.fn();
let authStateChangeCallback: ((event: string) => void) | null = null;

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: mockReplace,
      refresh: mockRefresh,
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

jest.mock('@/lib/supabase', () => {
  const auth = {
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  };

  return {
    supabase: { auth },
    __authMocks: auth,
  };
});

const { __authMocks } = jest.requireMock('@/lib/supabase') as {
  __authMocks: {
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
};

const mockSignInWithPassword = __authMocks.signInWithPassword;
const mockSignOut = __authMocks.signOut;
const mockOnAuthStateChange = __authMocks.onAuthStateChange;

function TestConsumer() {
  const { signIn, signOut } = useAuth();

  return (
    <div>
      <button onClick={() => signIn('admin@test.com', 'secret')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateChangeCallback = null;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });
  });

  it('refreshes the router when Supabase auth state changes', async () => {
    render(
      <AuthProvider hasSession>
        <div>child</div>
      </AuthProvider>
    );

    // The Supabase client is imported lazily, so the subscription is registered
    // a tick after mount rather than synchronously.
    await waitFor(() => {
      expect(authStateChangeCallback).not.toBeNull();
    });

    authStateChangeCallback?.('SIGNED_IN');

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('never touches the Supabase client for a signed-out visitor', async () => {
    // The client is ~200KB of JS. Subscribing when there is no session to watch
    // would pull it into the initial bundle of every public page for readers who
    // can never use it.
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('child')).toBeTruthy();
    });

    expect(mockOnAuthStateChange).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('navigates to admin after password sign-in succeeds', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'secret',
      });
      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });
  });

  it('navigates home after sign-out succeeds', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
