'use client';

import { useEffect, useRef, useState } from 'react';
import embed, { type EmbedOptions, type VisualizationSpec, type Result } from 'vega-embed';

export type VegaLiteChartProps = {
  spec: VisualizationSpec;
  options?: EmbedOptions;
  className?: string;
  'aria-label'?: string;
};

/**
 * Minimal Vega-Lite wrapper with spec versioning and safe cleanup (R45/P20).
 */
const VegaLiteChart = ({ spec, options, className, 'aria-label': ariaLabel }: VegaLiteChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      return;
    }

    const specClone: VisualizationSpec = JSON.parse(JSON.stringify(spec));
    let currentResult: Result | null = null;

    const embedOptions: EmbedOptions = {
      actions: false,
      renderer: 'svg',
      ...(options ?? {})
    };

    embed(containerElement, specClone, embedOptions)
      .then((result) => {
        resultRef.current = result;
        currentResult = result;
        setError(null);
      })
      .catch((error) => {
        console.error('Failed to render Vega-Lite spec', error);
        setError('Unable to render chart preview. Check console logs for details.');
      });

    return () => {
      if (currentResult) {
        currentResult.view.finalize();
        if (resultRef.current === currentResult) {
          resultRef.current = null;
        }
      }
      containerElement
        ?.querySelectorAll('canvas, svg, .vega-actions')
        .forEach((node) => node.remove());
    };
  }, [spec, options]);

  if (error) {
    return (
      <div className={className} role="alert" aria-live="polite">
        <p className="chart-card__error">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default VegaLiteChart;
