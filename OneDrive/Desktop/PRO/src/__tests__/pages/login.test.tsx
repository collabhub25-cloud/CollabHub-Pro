import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';

// Mock the required dependencies before importing the component
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock('@/components/ui/logo', () => ({
  Logo: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="logo" className={className}>Logo</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, loading, loadingText, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} className={className} data-variant={variant} {...props}>
      {loading ? (loadingText || children) : children}
    </button>
  ),
  buttonVariants: () => '',
}));

vi.mock('@/store', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
}));

// Import after mocks are set up
import LoginPage from '@/app/login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset location mock
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  it('renders the sign-in heading', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign in to AlloySphere')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<LoginPage />);
    expect(screen.getByText('Continue your journey in the network.')).toBeInTheDocument();
  });

  it('renders role selector label', () => {
    render(<LoginPage />);
    expect(screen.getByText('Select your role')).toBeInTheDocument();
  });

  it('renders all three role buttons', () => {
    render(<LoginPage />);
    expect(screen.getByText('FOUNDER')).toBeInTheDocument();
    expect(screen.getByText('INVESTOR')).toBeInTheDocument();
    expect(screen.getByText('TALENT')).toBeInTheDocument();
  });

  it('renders the Google sign-in button', () => {
    render(<LoginPage />);
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('renders privacy and terms links', () => {
    render(<LoginPage />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  it('renders the branding text', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Architecting the future/)).toBeInTheDocument();
  });

  it('renders create account link', () => {
    render(<LoginPage />);
    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });
});
