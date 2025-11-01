'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import embed, { type EmbedOptions } from 'vega-embed';
import type { Renderers, View } from 'vega';
import type { TopLevelSpec } from 'vega-lite';

const DEFAULT_SCHEMA = 'https://vega.github.io/schema/vega-lite/v6.json';
const DEFAULT_RENDERER: Renderers = 'canvas';

const clone = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

export type NamedDatasets = Record<string, unknown>;

type SignalListeners = Record<string, (name: string, value: unknown) => void>;

export type VegaLiteRendererProps = {
  spec: TopLevelSpec;
  version?: string | number;
  data?: NamedDatasets;
  renderer?: Renderers;
  className?: string;
  signalListeners?: SignalListeners;
  onReady?: (view: View) => void;
  onError?: (error: Error) => void;
};

export function VegaLiteRenderer({
  spec,
  version,
  data,
  renderer = DEFAULT_RENDERER,
  className,
  signalListeners,
  onReady,
  onError,
}: VegaLiteRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<View | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const preparedSpec = useMemo(() => {
    void version; // trigger memo updates when caller passes a new revision
    const specClone = clone(spec);

    if (!specClone.$schema) {
      specClone.$schema = DEFAULT_SCHEMA;
    }

    if (data && Object.keys(data).length > 0) {
      if (!specClone.datasets) {
        specClone.datasets = {};
      }
      Object.assign(specClone.datasets as Record<string, unknown>, data);
    }

    return specClone;
  }, [spec, version, data]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return () => undefined;
    }

    let isCancelled = false;
    const attachedSignals: Array<[string, SignalListeners[string]]> = [];

    const options: EmbedOptions = {
      actions: false,
      renderer,
      hover: true,
    };

    setError(null);

    embed(container, preparedSpec, options)
      .then((result) => {
        if (isCancelled) {
          result.view.finalize();
          return;
        }

        viewRef.current = result.view;

        if (signalListeners) {
          Object.entries(signalListeners).forEach(([signal, handler]) => {
            result.view.addSignalListener(signal, handler);
            attachedSignals.push([signal, handler]);
          });
        }

        onReady?.(result.view);
      })
      .catch((err) => {
        if (isCancelled) {
          return;
        }
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        setError(normalizedError);
        onError?.(normalizedError);
      });

    return () => {
      isCancelled = true;
      const view = viewRef.current;
      if (view) {
        attachedSignals.forEach(([signal, handler]) => {
          view.removeSignalListener(signal, handler);
        });
        view.finalize();
        viewRef.current = null;
      }
    };
  }, [preparedSpec, renderer, signalListeners, onReady, onError]);

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {error ? (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
            fontSize: '0.9rem',
          }}
        >
          {error.message}
        </div>
      ) : null}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} aria-label="Vega-Lite chart" />
    </div>
  );
}
