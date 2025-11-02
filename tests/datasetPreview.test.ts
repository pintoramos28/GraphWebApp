import { describe, expect, it } from 'vitest';

import { parseDelimitedText } from '@/lib/datasetPreview';

describe('parseDelimitedText', () => {
  it('parses valid comma-delimited data with inferred types', async () => {
    const result = await parseDelimitedText('team,hours\nAurora,10\nNimbus,12');

    expect(result.rowCount).toEqual(2);
    expect(result.truncated).toBe(false);
    expect(result.columns).toEqual([
      { fieldId: 'team', name: 'team', originalName: 'team', type: 'string' },
      { fieldId: 'hours', name: 'hours', originalName: 'hours', type: 'number' }
    ]);
    expect(result.rows[0]).toEqual({ team: 'Aurora', hours: 10 });
  });

  it('rejects HTML-like input early', async () => {
    await expect(parseDelimitedText('<html><body>not csv</body></html>')).rejects.toThrow(
      'Pasted data appears to contain HTML. Please paste raw delimited text.'
    );
  });

  it('maps malformed quoted fields to a helpful error message', async () => {
    await expect(parseDelimitedText('name\n"ab"c')).rejects.toThrow(
      'Malformed quoted field detected. Check for unmatched quotes in your data.'
    );
  });
});
