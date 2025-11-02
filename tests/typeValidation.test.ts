import { describe, expect, it } from 'vitest';
import { validateColumnType } from '@/lib/typeValidation';

const rows = [
  { hours: 10, flag: 'true', started: '2023-01-01T12:00:00Z' },
  { hours: '12.5', flag: 'false', started: '2023-01-02T08:00:00Z' },
  { hours: 'abc', flag: 'maybe', started: 'invalid date' }
];

describe('validateColumnType', () => {
  it('detects invalid numbers', () => {
    const result = validateColumnType(rows, 'hours', 'number');
    expect(result.valid).toBe(false);
    expect(result.invalidSample).toContain('abc');
  });

  it('detects invalid booleans', () => {
    const result = validateColumnType(rows, 'flag', 'boolean');
    expect(result.valid).toBe(false);
    expect(result.invalidSample).toContain('maybe');
  });

  it('accepts strings and datetimes appropriately', () => {
    const stringResult = validateColumnType(rows, 'flag', 'string');
    expect(stringResult.valid).toBe(true);

    const dateResult = validateColumnType(rows, 'started', 'datetime');
    expect(dateResult.valid).toBe(false);
  });
});
