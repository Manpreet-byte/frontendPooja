const DB_NAME = 'loveAndFlour';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('offline_lessons')) {
        const store = db.createObjectStore('offline_lessons', { keyPath: 'key' });
        store.createIndex('by_user', 'user_id');
        store.createIndex('by_course', 'course_id');
        store.createIndex('by_updated', 'updated_at');
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
        store.createIndex('by_user', 'user_id');
        store.createIndex('by_created', 'created_at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(storeName, mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = fn(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbPut(storeName, value) {
  return withStore(storeName, 'readwrite', (store) => store.put(value));
}

export async function idbGet(storeName, key) {
  return withStore(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function idbDelete(storeName, key) {
  return withStore(storeName, 'readwrite', (store) => store.delete(key));
}

export async function idbListByIndex(storeName, indexName, indexValue, { limit = 200 } = {}) {
  return withStore(storeName, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const idx = store.index(indexName);
      const results = [];
      const req = idx.openCursor(IDBKeyRange.only(indexValue), 'prev');
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor || results.length >= limit) return resolve(results);
        results.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  });
}

