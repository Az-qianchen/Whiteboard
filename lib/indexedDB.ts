// A simple key-value store using IndexedDB
// Based on idb-keyval library's concept

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('whiteboard-db', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('keyval');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB();
  }
  return dbPromise;
}

export async function get<T>(key: IDBValidKey): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keyval', 'readonly');
    const store = tx.objectStore('keyval');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

export async function set(key: IDBValidKey, value: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keyval', 'readwrite');
    const store = tx.objectStore('keyval');
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function del(key: IDBValidKey): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keyval', 'readwrite');
    const store = tx.objectStore('keyval');
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
