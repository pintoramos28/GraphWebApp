import { render, screen, waitFor } from '@testing-library/react';
import type { TopLevelSpec } from 'vega-lite';
import { vi } from 'vitest';

import { VegaLiteRenderer } from '@/charts/vega-lite';

const { embedMock } = vi.hoisted(() => ({
  embedMock: vi.fn(),
}));

vi.mock('vega-embed', () => ({
  __esModule: true,
  default: embedMock,
}));

describe('VegaLiteRenderer', () => {
  const baseSpec: TopLevelSpec = {
    data: { name: 'sample' },
    mark: 'point',
    encoding: {
      x: { field: 'stress', type: 'quantitative' },
      y: { field: 'strain', type: 'quantitative' },
    },
  };

  let currentView: {
    finalize: ReturnType<typeof vi.fn>;
    addSignalListener: ReturnType<typeof vi.fn>;
    removeSignalListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    currentView = {
      finalize: vi.fn(),
      addSignalListener: vi.fn(),
      removeSignalListener: vi.fn(),
    };
    embedMock.mockResolvedValue({ view: currentView });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('embeds spec with actions disabled and notifies readiness', async () => {
    const onReady = vi.fn();
    const { unmount } = render(
      <VegaLiteRenderer
        spec={baseSpec}
        data={{ sample: SAMPLE_VALUES }}
        version="1"
        renderer="svg"
        onReady={onReady}
      />,
    );

    await waitFor(() => {
      expect(embedMock).toHaveBeenCalledTimes(1);
    });

    const [, passedSpec, options] = embedMock.mock.calls[0];
    expect(passedSpec).toMatchObject({ data: { name: 'sample' } });
    expect(options.actions).toBe(false);
    expect(options.renderer).toBe('svg');
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });

    unmount();
    expect(currentView.finalize).toHaveBeenCalled();
  });

  it('attaches signal listeners and removes them on cleanup', async () => {
    const signal = vi.fn();
    const renderResult = render(
      <VegaLiteRenderer
        spec={baseSpec}
        data={{ sample: SAMPLE_VALUES }}
        renderer="svg"
        signalListeners={{ hover: signal }}
        version="2"
      />,
    );

    await waitFor(() => {
      expect(currentView.addSignalListener).toHaveBeenCalledWith('hover', signal);
    });

    renderResult.unmount();
    expect(currentView.removeSignalListener).toHaveBeenCalledWith('hover', signal);
  });

  it('surfaces embed errors', async () => {
    const failure = new Error('compile failed');
    embedMock.mockRejectedValueOnce(failure);
    const handleError = vi.fn();

    render(
      <VegaLiteRenderer
        spec={baseSpec}
        data={{ sample: SAMPLE_VALUES }}
        renderer="svg"
        onError={handleError}
      />,
    );

    await waitFor(() => {
      expect(handleError).toHaveBeenCalledWith(failure);
      expect(screen.getByRole('alert').textContent).toContain('compile failed');
    });
  });
});

const SAMPLE_VALUES = [
  { stress: 40, strain: 0.02 },
  { stress: 54, strain: 0.024 },
];
