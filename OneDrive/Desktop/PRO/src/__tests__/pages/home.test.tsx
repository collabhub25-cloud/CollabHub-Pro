import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';

// Mock dependencies
const mockPush = vi.fn();
const mockFetchUser = vi.fn();
const mockSetLoading = vi.fn();

let mockStoreState = {
  isAuthenticated: false,
  user: null as any,
  isLoading: true,
  fetchUser: mockFetchUser,
  setLoading: mockSetLoading,
};

vi.mock('next/navigation', async () => {
  return {
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
      pathname: '/',
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
  };
});

vi.mock('@/store', () => ({
  useAuthStore: () => mockStoreState,
}));

vi.mock('@/components/layout/theme-provider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));

vi.mock('@/components/landing/landing-page', () => ({
  LandingPage: ({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) => (
    <div data-testid="landing-page">
      <button onClick={onLogin}>Login</button>
      <button onClick={onRegister}>Register</button>
    </div>
  ),
}));

import Home from '@/app/page';

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      isAuthenticated: false,
      user: null,
      isLoading: true,
      fetchUser: mockFetchUser,
      setLoading: mockSetLoading,
    };
  });

  it('shows loading spinner while auth is loading', () => {
    mockStoreState.isLoading = true;
    render(<Home />);
    // Look for the spinner div
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders landing page for unauthenticated users', () => {
    mockStoreState.isLoading = false;
    mockStoreState.isAuthenticated = false;
    render(<Home />);
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  it('redirects authenticated founder to dashboard', () => {
    mockStoreState.isLoading = false;
    mockStoreState.isAuthenticated = true;
    mockStoreState.user = { _id: '1', role: 'founder', name: 'Test' };
    render(<Home />);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/founder');
  });

  it('redirects authenticated investor to dashboard', () => {
    mockStoreState.isLoading = false;
    mockStoreState.isAuthenticated = true;
    mockStoreState.user = { _id: '2', role: 'investor', name: 'Test' };
    render(<Home />);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/investor');
  });

  it('landing page login button navigates to /login', async () => {
    mockStoreState.isLoading = false;
    mockStoreState.isAuthenticated = false;
    const { user } = render(<Home />);
    await user.click(screen.getByText('Login'));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('landing page register button navigates to /signup/founder', async () => {
    mockStoreState.isLoading = false;
    mockStoreState.isAuthenticated = false;
    const { user } = render(<Home />);
    await user.click(screen.getByText('Register'));
    expect(mockPush).toHaveBeenCalledWith('/signup/founder');
  });
});
