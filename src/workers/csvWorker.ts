/// <reference lib="webworker" />

import {
  AsyncDuckDB,
  ConsoleLogger,
  getJsDelivrBundles,
  selectBundle
} from '@duckdb/duckdb-wasm';
import Papa from 'papaparse';
import type { Field } from 'apache-arrow';
import { buildColumnsFromFields } from '../lib/csvUtils';

type ParseRequest = {
  id: string;
  type: 'parse';
  fileName: string;
  fileType: string;
  buffer: ArrayBuffer;
  bypassDuckDb?: boolean;
};

type StatusResponse = {
  id: string;
  type: 'status';
  phase: 'loading' | 'parsing' | 'counting';
  message: string;
};

type ResultResponse = {
  id: string;
  type: 'result';
  result: {
    columns: { name: string; type: string }[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    truncated: boolean;
  };
};

type ErrorResponse = {
  id: string;
  type: 'error';
  message: string;
};

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let duckDbPromise: Promise<AsyncDuckDB> | null = null;

const postStatus = (payload: StatusResponse) => ctx.postMessage(payload);

const initDuckDb = async () => {
  if (duckDbPromise) {
    return duckDbPromise;
  }

  duckDbPromise = (async () => {
    const bundles = await selectBundle(getJsDelivrBundles());
    if (!bundles.mainWorker || !bundles.mainModule) {
      throw new Error('Failed to resolve DuckDB bundle assets');
    }
    const logger = new ConsoleLogger();
    const duckWorker = new Worker(new URL(bundles.mainWorker, import.meta.url), {
      type: 'module'
    });
    const db = new AsyncDuckDB(logger, duckWorker);
    await db.instantiate(
      new URL(bundles.mainModule, import.meta.url).toString(),
      bundles.pthreadWorker
        ? new URL(bundles.pthreadWorker, import.meta.url).toString()
        : undefined
    );
    return db;
  })()
    .catch((error) => {
      duckDbPromise = null;
      throw error;
    });

  return duckDbPromise;
};

const toRowObjects = (rows: unknown[]): Array<Record<string, unknown>> => {
  return rows.map((row) => (typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {}));
};

const DUCKDB_TIMEOUT_MS = 8000;

const parseWithDuckDb = async (request: ParseRequest) => {
  postStatus({
    id: request.id,
    type: 'status',
    phase: 'loading',
    message: 'Loading DuckDB bundle…'
  });

  const db = await initDuckDb();

  const fileName = request.fileName || 'dataset.csv';
  const virtualPath = `/${fileName}`;

  const buffer = new Uint8Array(request.buffer);

  await db.dropFile(virtualPath).catch(() => undefined);
  await db.registerFileBuffer(virtualPath, buffer);

  const connection = await db.connect();

  try {
    postStatus({
      id: request.id,
      type: 'status',
      phase: 'parsing',
      message: 'Parsing data with DuckDB…'
    });

    const viewName = `preview_${crypto.randomUUID().replace(/-/g, '_')}`;
    await connection.query(
      `CREATE OR REPLACE TEMPORARY VIEW ${viewName} AS SELECT * FROM read_csv_auto('${virtualPath}', SAMPLE_SIZE=20000, IGNORE_ERRORS=TRUE)`
    );

    const previewResult = await connection.query(`SELECT * FROM ${viewName} LIMIT 1000`);

    postStatus({
      id: request.id,
      type: 'status',
      phase: 'counting',
      message: 'Counting rows…'
    });

    const countResult = await connection.query(`SELECT COUNT(*) AS row_count FROM ${viewName}`);

    const rows = toRowObjects(previewResult.toArray() ?? []);
    const rowCountArray = toRowObjects(countResult.toArray() ?? []);
    const rowCount = Number(rowCountArray[0]?.row_count ?? rows.length);
    const truncated = rowCount > rows.length;

    const columns =
      previewResult.schema?.fields?.map((field: Field) => ({
        name: field.name,
        type: field.type?.toString?.() ?? 'unknown'
      })) ?? [];

    await connection.close();
    await db.dropFile(virtualPath).catch(() => undefined);

    return {
      columns,
      rows,
      rowCount,
      truncated
    };
  } catch (error) {
    await connection.close();
    await db.dropFile(virtualPath).catch(() => undefined);
    throw error;
  }
};

const parseWithPapa = (request: ParseRequest) => {
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(request.buffer);

  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    preview: 1000
  });

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message ?? 'Failed to parse file');
  }

  const rows = Array.isArray(result.data) ? result.data.filter(Boolean) : [];
  const fields = result.meta.fields ?? Object.keys(rows[0] ?? {});

  const columns = buildColumnsFromFields(fields, rows);

  return {
    columns,
    rows,
    rowCount: rows.length,
    truncated: rows.length >= 1000
  };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`DuckDB processing timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const handleParseRequest = async (request: ParseRequest): Promise<ResultResponse | ErrorResponse> => {
  if (request.bypassDuckDb) {
    try {
      postStatus({ id: request.id, type: 'status', phase: 'parsing', message: 'Parsing data…' });
      const fallback = parseWithPapa(request);
      return {
        id: request.id,
        type: 'result',
        result: fallback
      };
    } catch (parseError) {
      return {
        id: request.id,
        type: 'error',
        message: parseError instanceof Error ? parseError.message : 'Failed to parse file'
      };
    }
  }

  try {
    const duckResult = await withTimeout(parseWithDuckDb(request), DUCKDB_TIMEOUT_MS);
    return {
      id: request.id,
      type: 'result',
      result: duckResult
    };
  } catch (duckError) {
    console.error('DuckDB parsing failed, falling back to PapaParse', duckError);
    try {
      postStatus({
        id: request.id,
        type: 'status',
        phase: 'parsing',
        message: 'Falling back to PapaParse…'
      });
      const fallback = parseWithPapa(request);
      return {
        id: request.id,
        type: 'result',
        result: fallback
      };
    } catch (parseError) {
      console.error('CSV fallback parse failed', parseError);
      return {
        id: request.id,
        type: 'error',
        message: parseError instanceof Error ? parseError.message : 'Failed to parse file'
      };
    }
  }
};

ctx.addEventListener('message', async (event: MessageEvent<ParseRequest>) => {
  const { data } = event;
  if (!data || data.type !== 'parse') {
    return;
  }

  const response = await handleParseRequest(data);
  ctx.postMessage(response);
});
