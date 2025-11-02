import { createWorker } from '@/workers/createWorker';

type WorkerStatus = {
  id: string;
  type: 'status';
  phase: 'loading' | 'parsing' | 'counting';
  message: string;
};

type WorkerResult = {
  id: string;
  type: 'result';
  result: {
    columns: { name: string; type: string }[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    truncated: boolean;
  };
};

type WorkerError = {
  id: string;
  type: 'error';
  message: string;
};

type WorkerMessage = WorkerStatus | WorkerResult | WorkerError;

type WorkerCallbacks = {
  onStatus?: (message: WorkerStatus) => void;
};

type PendingRequest = {
  resolve: (result: WorkerResult['result']) => void;
  reject: (error: Error) => void;
  callbacks?: WorkerCallbacks;
};

let worker: Worker | null = null;
const pendingRequests = new Map<string, PendingRequest>();

const ensureWorker = () => {
  if (worker) {
    return worker;
  }

  worker = createWorker({
    url: new URL('../workers/csvWorker.ts', import.meta.url),
    options: { type: 'module' }
  });

  worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (!message || typeof message !== 'object' || !('id' in message)) {
      return;
    }

    const pending = pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    if (message.type === 'status') {
      pending.callbacks?.onStatus?.(message);
      return;
    }

    pendingRequests.delete(message.id);

    if (message.type === 'error') {
      pending.reject(new Error(message.message));
      return;
    }

    pending.resolve(message.result);
  });

  worker.addEventListener('error', (error) => {
    console.error('CSV worker error', error);
  });

  return worker;
};

export const importCsvFile = async (
  file: File,
  callbacks: WorkerCallbacks = {}
): Promise<WorkerResult['result']> => {
  const activeWorker = ensureWorker();
  const requestId = crypto.randomUUID();

  const buffer = await file.arrayBuffer();

  const shouldBypassDuckDb =
    typeof navigator !== 'undefined' &&
    (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent ?? ''));

  return new Promise<WorkerResult['result']>((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject, callbacks });

    activeWorker.postMessage(
      {
        id: requestId,
        type: 'parse',
        fileName: file.name,
        fileType: file.type,
        buffer,
        bypassDuckDb: shouldBypassDuckDb
      },
      [buffer]
    );
  });
};
