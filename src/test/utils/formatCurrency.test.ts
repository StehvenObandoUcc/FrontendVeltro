import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../utils/formatCurrency';

describe('formatCurrency', () => {
  const cleanSpaces = (str: string) => str.replace(/\s/g, ' ');

  it('formats integer values correctly for COP', () => {
    // Standard es-CO formats with no decimals should use dots for thousands separator
    const result = cleanSpaces(formatCurrency(15000));
    expect(result).toMatch(/^\$?\s*15[.,]000$/);
  });

  it('formats decimal values correctly with up to 2 decimal places', () => {
    const result = cleanSpaces(formatCurrency(15000.5));
    // Decimals in es-CO standard usually use comma, e.g. 15.000,50 or 15.000,5
    expect(result).toMatch(/^\$?\s*15[.,]000[.,]50?$/);
  });

  it('handles string representations of numbers', () => {
    const result1 = cleanSpaces(formatCurrency('2500'));
    expect(result1).toMatch(/^\$?\s*2[.,]500$/);

    const result2 = cleanSpaces(formatCurrency('2500.75'));
    expect(result2).toMatch(/^\$?\s*2[.,]500[.,]75$/);
  });

  it('handles invalid numeric values or NaNs gracefully', () => {
    const result1 = cleanSpaces(formatCurrency('invalid'));
    expect(result1).toBe('$ 0');

    const result2 = cleanSpaces(formatCurrency(NaN));
    expect(result2).toBe('$ 0');
  });

  it('handles edge cases like zero', () => {
    const result = cleanSpaces(formatCurrency(0));
    expect(result).toMatch(/^\$?\s*0$/);
  });
});
