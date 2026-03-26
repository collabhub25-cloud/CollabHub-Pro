import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test-utils';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders as a span by default', () => {
    render(<Badge>Status</Badge>);
    const badge = screen.getByText('Status');
    expect(badge.tagName).toBe('SPAN');
  });

  it('has data-slot attribute', () => {
    render(<Badge>Slot</Badge>);
    const badge = screen.getByText('Slot');
    expect(badge).toHaveAttribute('data-slot', 'badge');
  });

  it('applies default variant classes', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-primary');
  });

  it('applies secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const badge = screen.getByText('Secondary');
    expect(badge.className).toContain('bg-secondary');
  });

  it('applies destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge.className).toContain('bg-destructive');
  });

  it('applies outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText('Outline');
    expect(badge.className).toContain('text-foreground');
  });

  it('merges custom className', () => {
    render(<Badge className="my-badge">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('my-badge');
  });
});
