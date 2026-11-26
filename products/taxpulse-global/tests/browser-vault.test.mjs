import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openEncryptedVault } from '../engine/browser-vault.mjs';

function fakeIndexedDB() {
  const rows = new Map();
  let initialized = false;
  const db = {
    objectStoreNames: { contains: name => initialized && name === 'records' },
    createObjectStore(name) {
      assert.equal(name, 'records');
      initialized = true;
    },
    transaction(name, mode) {
      assert.equal(name, 'records');
      assert.ok(mode === 'readwrite' || mode === 'readonly');
      let aborted = false;
      const tx = {
        error: null,
        oncomplete: null,
        onabort: null,
        onerror: null,
        abort() {
          aborted = true;
          queueMicrotask(() => tx.onabort?.());
        },
        objectStore(storeName) {
          assert.equal(storeName, name);
          function makeRequest(operation) {
            const req = { result: undefined, error: null, onsuccess: null, onerror: null };
            queueMicrotask(() => {
              if (aborted) return;
              try {
                req.result = operation();
                req.onsuccess?.();
                // The completion callback must happen after the request's Promise continuation.
                setTimeout(() => { if (!aborted) tx.oncomplete?.(); }, 0);
              } catch (error) {
                req.error = error;
                tx.error = error;
                req.onerror?.();
                queueMicrotask(() => tx.onerror?.());
              }
            });
            return req;
          }
          return {
            count: () => makeRequest(() => rows.size),
            add: row => makeRequest(() => {
              if (rows.has(row.id)) throw Error('Duplicate key');
              rows.set(row.id, structuredClone(row));
              return row.id;
            }),
            get: id => makeRequest(() => structuredClone(rows.get(id))),
            getAll: () => makeRequest(() => [...rows.values()].map(row => structuredClone(row))),
            delete: id => makeRequest(() => rows.delete(id))
          };
        }
      };
      return tx;
    },
    close() {}
  };
  return {
    rows,
    open(name, version) {
      assert.equal(name, 'TaxPulseEncryptedRecords');
      assert.equal(version, 1);
      const req = { result: db, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      queueMicrotask(() => {
        if (!initialized) req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    }
  };
}

test('encrypted records persist locally without retaining plaintext or a password', async () => {
  const local = fakeIndexedDB();
  const vault = await openEncryptedVault({ indexedDB: local, randomUUID });
  const password = 'an-example-passphrase-for-unit-tests';
  const record = { country: 'GB', grossSalary: 123456, privateName: 'Sensitive Example' };
  const saved = await vault.save(record, password);
  assert.match(saved.id, /^[0-9a-f-]{36}$/i);
  assert.equal(local.rows.size, 1);
  assert.doesNotMatch(JSON.stringify([...local.rows.values()]), /Sensitive Example|123456|example-passphrase/);
  assert.deepEqual(await vault.read(saved.id, password), record);
  assert.deepEqual(await vault.list(), [saved]);
  await assert.rejects(vault.read(saved.id, 'incorrect-password-for-tests'));
  assert.equal(await vault.remove(saved.id), true);
  assert.equal(await vault.remove(saved.id), false);
  assert.equal(await vault.read(saved.id, password), null);
  vault.close();
  await assert.rejects(vault.list(), /closed/i);
});

test('vault fails closed for unavailable storage, invalid IDs and tampered ciphertext', async () => {
  await assert.rejects(openEncryptedVault({ indexedDB: undefined, randomUUID }), /IndexedDB/);
  const local = fakeIndexedDB();
  const vault = await openEncryptedVault({ indexedDB: local, randomUUID });
  await assert.rejects(vault.save('plaintext', 'an-example-passphrase-for-unit-tests'), /JSON object/);
  await assert.rejects(vault.read('../inject', 'an-example-passphrase-for-unit-tests'), /Invalid record ID/);
  const saved = await vault.save({ amount: 999 }, 'an-example-passphrase-for-unit-tests');
  const stored = local.rows.get(saved.id);
  stored.envelope.ciphertext = (stored.envelope.ciphertext[0] === '0' ? '1' : '0') + stored.envelope.ciphertext.slice(1);
  await assert.rejects(vault.read(saved.id, 'an-example-passphrase-for-unit-tests'));
  vault.close();
});
