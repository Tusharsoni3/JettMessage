import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

// --- Types & Interfaces ---

export interface ContactKey {
  name : string;       // User's display name
  email: string;      // Used as the primary key for lookups
  userId: string;     // The backend UUID of the friend
  publicKey: string;  // Their Kyber Public Key for locking messages   
}

const DB_NAME = 'jettmessages_secure_store';
const KEY_STORE = 'key_store';
const CONTACTS_STORE = 'contacts_store';
const DB_VERSION = 2; // Bumped to 2 to trigger the new store creation

// Extending DBSchema gives us strict type safety for every store
export interface SecureDB extends DBSchema {
  [KEY_STORE]: {
    key: string;
    value: string; // Storing the key as a base64 or hex string
  };
  [CONTACTS_STORE]: {
    key: string;       // Email acts as the key
    value: ContactKey; // The full object payload
  };
}

let dbPromise: Promise<IDBPDatabase<SecureDB>> | null = null;

// --- Initialization ---

export const getDB = (): Promise<IDBPDatabase<SecureDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<SecureDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Version 1: Create the Master Key Store
        if (!db.objectStoreNames.contains(KEY_STORE)) {
          db.createObjectStore(KEY_STORE);
        }
        
        // Version 2: Create the Contacts Store
        if (!db.objectStoreNames.contains(CONTACTS_STORE)) {
          // Setting keyPath means idb will automatically extract the 'email' 
          // property from the object we save and use it as the database key
          db.createObjectStore(CONTACTS_STORE, { keyPath: 'email' });
        }
      },
    });
  }
  return dbPromise;
};

// --- Service Methods ---

export const dbService = {
  // -------------------------
  // USER IDENTITY KEYS
  // -------------------------

  /**
   * Securely saves the master private key to IndexedDB
   */
  async saveMasterPrivateKey(privateKeyHex: string): Promise<void> {
    const db = await getDB();
    await db.put(KEY_STORE, privateKeyHex, 'master_private_key');
  },

  /**
   * Retrieves the master private key from IndexedDB
   */
  async getMasterPrivateKey(): Promise<string | undefined> {
    const db = await getDB();
    return db.get(KEY_STORE, 'master_private_key');
  },

  // -------------------------
  // CONTACT PUBLIC KEYS
  // -------------------------

  /**
   * Saves a friend's public key to the local device for fast encryption
   */
  async saveContactPublicKey(contact: ContactKey): Promise<void> {
    const db = await getDB();
    // No need to pass the key explicitly because we set { keyPath: 'email' }
    await db.put(CONTACTS_STORE, contact);
  },

  /**
   * Fetches a friend's public key by their email
   */
  async getContactPublicKey(email: string): Promise<ContactKey | undefined> {
    const db = await getDB();
    return db.get(CONTACTS_STORE, email);
  },

  /**
   *  Get all cached contacts to display a "Friends" list locally
   */
  async getAllContacts(): Promise<ContactKey[]> {
    const db = await getDB();
    return db.getAll(CONTACTS_STORE);
  },

  // -------------------------
  // SESSION MANAGEMENT
  // -------------------------

  /**
   * Clears out all secure data on logout to protect the user's privacy
   */
  async clearSecureStore(): Promise<void> {
    const db = await getDB();
    
    // 1. Delete the user's private key
    await db.delete(KEY_STORE, 'master_private_key');
    
    // 2. Clear out the entire cache of friends' public keys
    // (If Alice logs out and Bob logs in on the same computer, 
    // Bob shouldn't see Alice's contact list!)
    await db.clear(CONTACTS_STORE); 
  }
};