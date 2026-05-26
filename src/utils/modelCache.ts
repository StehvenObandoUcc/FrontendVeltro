/**
 * modelCache — Persistent IndexedDB cache for ONNX model binaries.
 *
 * WHY:
 *   onnxruntime-web's InferenceSession.create(url) issues a standard HTTP GET
 *   every time the worker starts. If the browser clears its HTTP cache (user
 *   action, privacy mode, device low-storage eviction) the full model file is
 *   re-downloaded. For a POS scenario where the operator opens the camera many
 *   times per day, a persistent client-side store eliminates that penalty after
 *   the very first load.
 *
 * HOW:
 *   1. On first call, fetch(url) downloads the binary and stores the ArrayBuffer
 *      in IndexedDB under a key derived from the URL.
 *   2. On subsequent calls (same browser, same URL), the ArrayBuffer is read
 *      directly from IndexedDB — no network request, no HTTP cache dependency.
 *   3. onnxruntime-web 1.25.1 officially supports InferenceSession.create(ArrayBuffer),
 *      so the returned buffer can be passed directly without conversion.
 *
 * WHAT IS NOT HANDLED HERE:
 *   - Cache invalidation by model version: if yolov11.onnx changes on the server,
 *     the cached binary will still be served. For versioned invalidation, append a
 *     version token to the URL (e.g. /model/yolov11.onnx?v=2) and the different
 *     key will trigger a new download automatically.
 *   - Safari private-browsing mode: IndexedDB is unavailable in Safari private mode.
 *     The fallback path (direct URL string) is used automatically.
 *
 * SCOPE:
 *   This module is designed to run inside a Web Worker context (self.indexedDB).
 *   It also works in the main thread (window.indexedDB) because both expose the
 *   same IDBFactory interface. No external dependencies required.
 */

const DB_NAME    = 'veltro-model-cache';
const DB_VERSION = 1;
const STORE_NAME = 'models';

/**
 * Open (or create) the IndexedDB database and object store.
 * Returns a promise that resolves with the IDBDatabase instance.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (evt) => {
      const db = (evt.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = (evt) => resolve((evt.target as IDBOpenDBRequest).result);
    req.onerror   = ()    => reject(req.error);
  });
}

/**
 * Read an ArrayBuffer from the IndexedDB store by key.
 * Returns null if the key does not exist.
 */
function readFromCache(db: IDBDatabase, key: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Write an ArrayBuffer into the IndexedDB store under key.
 */
function writeToCache(db: IDBDatabase, key: string, buffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(buffer, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Load a model binary by URL with IndexedDB caching.
 *
 * - If the buffer is already in IndexedDB: returns it immediately (no network).
 * - If not: fetches it from the network, stores it in IndexedDB, and returns it.
 * - On any IndexedDB error (e.g. Safari private mode): falls back to returning
 *   the URL string so the caller can use InferenceSession.create(url) instead.
 *
 * @param url  The URL of the ONNX model file (e.g. '/model/yolov11.onnx').
 * @returns    An ArrayBuffer with the model binary, or the original URL string
 *             as a fallback if IndexedDB is unavailable.
 */
export async function loadModelWithCache(url: string): Promise<ArrayBuffer | string> {
  try {
    const db     = await openDb();
    const cached = await readFromCache(db, url);

    if (cached) {
      console.log(`[ModelCache] Loaded from IndexedDB: ${url} (${(cached.byteLength / 1024 / 1024).toFixed(2)} MB)`);
      return cached;
    }

    // Not cached — fetch from network and persist.
    console.log(`[ModelCache] Fetching from network: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    await writeToCache(db, url, buffer);
    console.log(`[ModelCache] Stored in IndexedDB: ${url} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
    return buffer;

  } catch (err) {
    // IndexedDB unavailable (private mode, quota exceeded, etc.) — degrade gracefully.
    console.warn('[ModelCache] IndexedDB unavailable, falling back to direct URL:', err);
    return url;
  }
}
