import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportConfig } from '../ReportConfig';

describe('ReportConfig', () => {
  it('renders all three mode options', () => {
    render(<ReportConfig mode="standard" onChange={() => {}} />);
    expect(screen.getByText('Szybki')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('MAX')).toBeInTheDocument();
  });

  it('marks the selected mode with aria-checked', () => {
    render(<ReportConfig mode="max" onChange={() => {}} />);
    const maxBtn = screen.getByRole('radio', { name: /MAX/i });
    expect(maxBtn).toHaveAttribute('aria-checked', 'true');

    const quickBtn = screen.getByRole('radio', { name: /Szybki/i });
    expect(quickBtn).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with correct mode when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReportConfig mode="standard" onChange={onChange} />);

    await user.click(screen.getByText('Szybki'));
    expect(onChange).toHaveBeenCalledWith('quick');

    await user.click(screen.getByText('MAX'));
    expect(onChange).toHaveBeenCalledWith('max');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<ReportConfig mode="standard" onChange={() => {}} disabled />);
    const buttons = screen.getAllByRole('radio');
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });

  it('renders descriptions for each mode', () => {
    render(<ReportConfig mode="standard" onChange={() => {}} />);
    expect(screen.getByText('Podstawowe metryki, bez AI')).toBeInTheDocument();
    expect(screen.getByText(/Pełne dane/)).toBeInTheDocument();
    expect(screen.getByText(/Głęboka analiza/)).toBeInTheDocument();
  });

  it('uses fieldset with accessible legend', () => {
    render(<ReportConfig mode="standard" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /konfiguracja trybu raportu/i })).toBeInTheDocument();
  });

  it('has radiogroup role for mode selection', () => {
    render(<ReportConfig mode="standard" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});
