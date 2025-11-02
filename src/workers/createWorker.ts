export type CreateWorkerParams = {
  url: string | URL;
  options?: WorkerOptions;
};

/**
 * Shared helper to instantiate web workers with mandatory runtime error reporting.
 * Ensures `error` and `messageerror` surface through `console.error` so smoke tests fail (R49/P87).
 */
export const createWorker = ({ url, options }: CreateWorkerParams): Worker => {
  const worker = new Worker(url, options);

  worker.addEventListener('error', (event) => {
    const { message, filename, lineno, colno } = event;
    console.error(
      `[worker:error] ${message} at ${filename}:${lineno}:${colno}`,
      event.error ?? null,
    );
  });

  worker.addEventListener('messageerror', (event) => {
    console.error('[worker:messageerror]', event.data);
  });

  return worker;
};

export type CreateWorker = typeof createWorker;
