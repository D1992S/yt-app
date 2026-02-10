import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateSelector } from '../DateSelector';
import { DateRange } from '../../types';

const makeRange = (days: number, preset: string = '7d'): DateRange => ({
  start: new Date(2025, 0, 1),
  end: new Date(2025, 0, 1 + days),
  preset: preset as any,
});

describe('DateSelector', () => {
  it('renders all preset buttons', () => {
    render(<DateSelector value={makeRange(7)} onChange={() => {}} />);
    expect(screen.getByText('7 Dni')).toBeInTheDocument();
    expect(screen.getByText('28 Dni')).toBeInTheDocument();
    expect(screen.getByText('90 Dni')).toBeInTheDocument();
    expect(screen.getByText('Rok')).toBeInTheDocument();
  });

  it('marks the active preset with aria-checked', () => {
    render(<DateSelector value={makeRange(28, '28d')} onChange={() => {}} />);
    const btn28 = screen.getByRole('radio', { name: /28 Dni/i });
    expect(btn28).toHaveAttribute('aria-checked', 'true');

    const btn7 = screen.getByRole('radio', { name: /7 Dni/i });
    expect(btn7).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange when a preset button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateSelector value={makeRange(7)} onChange={onChange} />);

    await user.click(screen.getByText('90 Dni'));
    expect(onChange).toHaveBeenCalledTimes(1);

    const arg = onChange.mock.calls[0][0];
    expect(arg.preset).toBe('90d');
    expect(arg.start).toBeInstanceOf(Date);
    expect(arg.end).toBeInstanceOf(Date);
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<DateSelector value={makeRange(7)} onChange={() => {}} disabled />);
    const buttons = screen.getAllByRole('radio');
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });

  it('displays the date range', () => {
    const range = makeRange(7);
    render(<DateSelector value={range} onChange={() => {}} />);
    expect(screen.getByText(range.start.toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(range.end.toLocaleDateString())).toBeInTheDocument();
  });

  it('has accessible fieldset and legend', () => {
    render(<DateSelector value={makeRange(7)} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /wybór zakresu danych/i })).toBeInTheDocument();
  });

  it('has aria-live region for date display updates', () => {
    const { container } = render(<DateSelector value={makeRange(7)} onChange={() => {}} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
