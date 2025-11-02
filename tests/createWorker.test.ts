import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWorker } from '@/workers/createWorker';

type Listener = (event: any) => void;

class MockWorker {
  public static instances: MockWorker[] = [];
  public readonly listeners = new Map<string, Listener[]>();

  public constructor(public readonly url: string | URL, public readonly options?: WorkerOptions) {
    MockWorker.instances.push(this);
  }

  public addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (!listener) {
      return;
    }
    const fn: Listener =
      typeof listener === 'function'
        ? listener
        : // eslint-disable-next-line @typescript-eslint/unbound-method
          listener.handleEvent?.bind(listener) ?? (() => {});
    const entries = this.listeners.get(type) ?? [];
    entries.push(fn);
    this.listeners.set(type, entries);
  }

  // Stubs required interface methods (unused in tests).
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public removeEventListener(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public postMessage(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public terminate(): void {}

  public dispatch(type: string, event: unknown) {
    const entries = this.listeners.get(type) ?? [];
    for (const listener of entries) {
      listener(event);
    }
  }
}

describe('createWorker', () => {
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    MockWorker.instances = [];
    (globalThis as unknown as { Worker: typeof Worker }).Worker =
      MockWorker as unknown as typeof Worker;
  });

  afterEach(() => {
    (globalThis as unknown as { Worker: typeof Worker }).Worker = originalWorker;
  });

  it('attaches error handlers to the worker instance', () => {
    const worker = createWorker({ url: new URL('worker.js', 'http://localhost/') });
    const mock = worker as unknown as MockWorker;

    expect(MockWorker.instances).toHaveLength(1);
    expect(MockWorker.instances[0]).toBe(mock);
    expect(mock.listeners.get('error')).toHaveLength(1);
    expect(mock.listeners.get('messageerror')).toHaveLength(1);
  });

  it('forwards worker error events to console.error guard rails', () => {
    const worker = createWorker({ url: new URL('worker.js', 'http://localhost/') });
    const mock = worker as unknown as MockWorker;

    const errorEvent = {
      message: 'Simulated failure',
      filename: 'worker.js',
      lineno: 5,
      colno: 12,
      error: new Error('worker boom')
    };

    expect(() => mock.dispatch('error', errorEvent)).toThrow(/worker:error/);
  });

  it('forwards worker messageerror events to console.error guard rails', () => {
    const worker = createWorker({ url: new URL('worker.js', 'http://localhost/') });
    const mock = worker as unknown as MockWorker;

    expect(() => mock.dispatch('messageerror', { data: { payload: 'bad message' } })).toThrow(
      /worker:messageerror/,
    );
  });
});
