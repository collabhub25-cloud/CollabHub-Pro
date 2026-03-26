import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test-utils';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('has data-slot attribute', () => {
    render(<Input placeholder="test" />);
    const input = screen.getByPlaceholderText('test');
    expect(input).toHaveAttribute('data-slot', 'input');
  });

  it('accepts and displays typed text', async () => {
    const { user } = render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here') as HTMLInputElement;

    await user.type(input, 'Hello World');
    expect(input.value).toBe('Hello World');
  });

  it('supports different input types', () => {
    render(<Input type="email" placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('supports disabled state', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
  });

  it('merges custom className', () => {
    render(<Input className="custom-input" placeholder="custom" />);
    const input = screen.getByPlaceholderText('custom');
    expect(input.className).toContain('custom-input');
  });

  it('passes through extra props', () => {
    render(<Input data-testid="my-input" placeholder="props" />);
    expect(screen.getByTestId('my-input')).toBeInTheDocument();
  });

  it('supports controlled value', () => {
    render(<Input value="controlled" readOnly placeholder="ctrl" />);
    const input = screen.getByPlaceholderText('ctrl') as HTMLInputElement;
    expect(input.value).toBe('controlled');
  });
});
