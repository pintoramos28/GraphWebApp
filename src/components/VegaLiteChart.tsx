'use client';

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      return;
    }

    const specClone: VisualizationSpec = JSON.parse(JSON.stringify(spec));
    let currentResult: Result | null = null;

    embed(containerElement, specClone, {
      actions: false,
      renderer: 'canvas',
      ...options
    })
      .then((result) => {
        resultRef.current = result;
        currentResult = result;
      })
      .catch((error) => {
        console.error('Failed to render Vega-Lite spec', error);
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

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />;
};

export default VegaLiteChart;
