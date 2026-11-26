import { encryptRecord, decryptRecord } from './secure-records.mjs';

// Device-local encrypted storage. The passphrase is never saved, cached, or sent over the network.
// IndexedDB persists opaque AES-GCM envelopes, random IDs, and timestamps only.
const DATABASE_NAME = 'TaxPulseEncryptedRecords';
const DATABASE_VERSION = 1;
const STORE = 'records';
const MAX_RECORDS = 256;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function storageError(error) {
  return new Error('Local encrypted storage failed', { cause: error });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(storageError(request.error));
  });
}

function transactionResult(db, mode, action) {
  const tx = db.transaction(STORE, mode);
  const completed = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(storageError(tx.error));
    tx.onabort = () => reject(storageError(tx.error));
  });
  return (async () => {
    let value;
    try {
      value = await action(tx.objectStore(STORE));
    } catch (error) {
      try { tx.abort(); } catch { /* already completed or aborted */ }
      // Consume the aborted transaction's rejection; preserve the original error.
      await completed.catch(() => {});
      throw error;
    }
    await completed;
    return value;
  })();
}

function openDatabase(idb) {
  if (!idb || typeof idb.open !== 'function') {
    throw Error('IndexedDB is unavailable; encrypted local storage cannot be enabled');
  }
  return new Promise((resolve, reject) => {
    let request;
    try { request = idb.open(DATABASE_NAME, DATABASE_VERSION); }
    catch (error) { reject(storageError(error)); return; }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(storageError(request.error));
    request.onblocked = () => reject(Error('Close other TaxPulse tabs before reopening the vault'));
  });
}

function validId(id) {
  if (typeof id !== 'string' || !ID.test(id)) throw Error('Invalid record ID');
  return id;
}

export async function openEncryptedVault({
  indexedDB = globalThis.indexedDB,
  randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
  now = () => new Date().toISOString()
} = {}) {
  if (typeof randomUUID !== 'function' || typeof now !== 'function') {
    throw Error('Secure browser randomness and clock are required');
  }
  const db = await openDatabase(indexedDB);
  let closed = false;
  const ensureOpen = () => { if (closed) throw Error('Vault is closed'); };
  return Object.freeze({
    async save(record, password) {
      ensureOpen();
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw Error('A JSON object is required');
      }
      // Encryption and passphrase validation happen before opening a write transaction.
      const envelope = await encryptRecord(record, password);
      const id = validId(randomUUID());
      const createdAt = now();
      if (!/^\d{4}-\d{2}-\d{2}T/.test(createdAt)) throw Error('Invalid timestamp');
      await transactionResult(db, 'readwrite', async store => {
        const count = await requestResult(store.count());
        if (count >= MAX_RECORDS) throw Error('Vault record limit reached');
        await requestResult(store.add({ id, createdAt, envelope }));
      });
      return Object.freeze({ id, createdAt });
    },
    async read(id, password) {
      ensureOpen();
      const row = await transactionResult(db, 'readonly',
        store => requestResult(store.get(validId(id))));
      if (!row) return null;
      return decryptRecord(row.envelope, password);
    },
    async list() {
      ensureOpen();
      const rows = await transactionResult(db, 'readonly',
        store => requestResult(store.getAll()));
      return rows.map(row => Object.freeze({ id: row.id, createdAt: row.createdAt }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async remove(id) {
      ensureOpen();
      return transactionResult(db, 'readwrite', async store => {
        const key = validId(id);
        const exists = Boolean(await requestResult(store.get(key)));
        if (exists) await requestResult(store.delete(key));
        return exists;
      });
    },
    close() {
      if (!closed) { closed = true; db.close(); }
    }
  });
}
