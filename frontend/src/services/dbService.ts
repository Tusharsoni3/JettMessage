import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'jettmessages_secure_store';
const STORE_NAME = 'key_store';
const DB_VERSION = 1;

export interface SecureDB {
  [STORE_NAME]: {
    key: string;
    value: string; // Storing the key as a base64 or hex string
  };
}

let dbPromise: Promise<IDBPDatabase<SecureDB>> | null = null;

export const getDB = (): Promise<IDBPDatabase<SecureDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<SecureDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

export const dbService = {
  /**
   * Securely saves the master private key to IndexedDB
   */
  async saveMasterPrivateKey(privateKeyHex: string): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, privateKeyHex, 'master_private_key');
  },

  /**
   * Retrieves the master private key from IndexedDB
   */
  async getMasterPrivateKey(): Promise<string | undefined> {
    const db = await getDB();
    return db.get(STORE_NAME, 'master_private_key');
  },

  /**
   * Clears out keys on logout
   */
  async clearSecureStore(): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, 'master_private_key');
  }
};