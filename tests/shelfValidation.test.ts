import { describe, expect, it } from 'vitest';
import { validateShelfAssignment } from '@/lib/shelfConfig';
import type { EncodingField } from '@/lib/encodingTypes';

const buildField = (overrides: Partial<EncodingField>): EncodingField => ({
  fieldId: 'field-1',
  name: 'hours',
  label: 'Hours',
  type: 'number',
  ...overrides
});

describe('shelf assignment validation', () => {
  it('accepts numeric fields on quantitative shelves', () => {
    const result = validateShelfAssignment('y', buildField({ type: 'number' }));
    expect(result).toEqual({ valid: true });
  });

  it('rejects string fields on Y shelf with explanation', () => {
    const result = validateShelfAssignment('y', buildField({ type: 'string', name: 'Team' }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('Y Axis');
      expect(result.reason).toContain('categorical');
    }
  });

  it('supports temporal fields on X shelf', () => {
    const result = validateShelfAssignment('x', buildField({ type: 'datetime', name: 'Timestamp' }));
    expect(result).toEqual({ valid: true });
  });

  it('rejects unsupported types gracefully', () => {
    const result = validateShelfAssignment('shape', buildField({ type: 'object', name: 'Payload' }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('not a supported type');
    }
  });
});
