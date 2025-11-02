import { describe, expect, it } from 'vitest';
import { validateColumnType } from '@/lib/typeValidation';

const rows = [
  { hours: 10, team: 'Aurora', flag: 'true', launched: '2023-01-01' },
  { hours: '12', team: 'Nimbus', flag: 'false', launched: '2023-01-02' },
  { hours: 'abc', team: 'Zenith', flag: 'maybe', launched: 'invalid date' }
];

describe('validateColumnType', () => {
  it('accepts valid number conversions', () => {
    const result = validateColumnType(rows, 'hours', 'number');
    expect(result.valid).toBe(false);
  });

  it('identifies invalid boolean conversions', () => {
    const result = validateColumnType(rows, 'flag', 'boolean');
    expect(result.valid).toBe(false);
    expect(result.invalidSample).toContain('maybe');
  });

  it('accepts string conversions', () => {
    const result = validateColumnType(rows, 'team', 'string');
    expect(result.valid).toBe(true);
  });
});
