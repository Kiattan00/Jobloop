"use client";

const DB_NAME = "jobloop-local-files";
const DB_VERSION = 1;
const PDF_STORE = "resume-pdfs";
const LOCAL_PDF_URL_PREFIX = "indexeddb:resume-pdf:";

const isBrowser = () => typeof window !== "undefined";

function openPdfDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!isBrowser() || !window.indexedDB) {
      reject(new Error("当前浏览器不支持本地 PDF 文件存储。"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        db.createObjectStore(PDF_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error || new Error("打开本地 PDF 文件库失败。"));
    };
  });
}

function withPdfStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openPdfDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(PDF_STORE, mode);
        const store = transaction.objectStore(PDF_STORE);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          reject(request.error || new Error("读取本地 PDF 文件失败。"));
        };
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error || new Error("本地 PDF 文件操作失败。"));
        };
      }),
  );
}

export function createLocalPdfFileUrl(sourceResumeId: string) {
  return `${LOCAL_PDF_URL_PREFIX}${sourceResumeId}`;
}

export function isLocalPdfFileUrl(fileUrl?: string) {
  return Boolean(fileUrl?.startsWith(LOCAL_PDF_URL_PREFIX));
}

export async function saveLocalResumePdf(sourceResumeId: string, file: File) {
  await withPdfStore("readwrite", (store) => store.put(file, sourceResumeId));
}

export async function getLocalResumePdf(sourceResumeId: string) {
  const value = await withPdfStore<Blob | undefined>("readonly", (store) =>
    store.get(sourceResumeId),
  );

  return value instanceof Blob ? value : null;
}
