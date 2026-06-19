// Helper functions to convert between buffers and hex strings
const bufferToHex = (buffer: ArrayBuffer | ArrayBufferLike): string => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const hexToBuffer = (hex: string): ArrayBuffer => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
};

export interface SplitKeys {
  keyA: string; // Auth Token for Server
  keyB: ArrayBuffer; // Local Encryption Padlock
}

export interface EncryptedBundle {
  ciphertext: string;
  iv: string;
}

export const cryptoService = {
  /**
   * Derives a deterministic salt using a SHA-256 hash of the email
   */
  async deriveSalt(email: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    // Digest returns an ArrayBuffer which perfectly satisfies the Web Crypto BufferSource requirement
    return await window.crypto.subtle.digest("SHA-256", data);
  },

  /**
   * Runs PBKDF2 on the password and splits the resulting 512-bit key in half
   */
  async deriveAndSplitPassword(
    password: string,
    email: string,
  ): Promise<SplitKeys> {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const salt = await this.deriveSalt(email);

    // Import the raw password text as a base key
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      ["deriveBits"],
    );

    // Derive a 512-bit (64 bytes) key string
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000, // Balanced configuration for browser performance
        hash: "SHA-256",
      },
      baseKey,
      512,
    );

    // Slice the 64 bytes perfectly into two 32-byte chunks (256-bit keys)
    const keyABuffer = derivedBits.slice(0, 32);
    const keyBBuffer = derivedBits.slice(32, 64);

    return {
      keyA: bufferToHex(keyABuffer), // Converted to hex string to be sent securely to server
      keyB: keyBBuffer, // Kept raw in memory as an ArrayBuffer for local encryption
    };
  },

  /**
   * Generates your ML-KEM / Kyber master asymmetric key pair
   */
  async generateMLKEMKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    // TODO: Replace placeholders with your chosen ML-KEM lib (e.g., crystals-kyber or WASM)
    // Generating high-entropy secure placeholders for implementation sanity check
    const pkBuffer = window.crypto.getRandomValues(new Uint8Array(32));
    const skBuffer = window.crypto.getRandomValues(new Uint8Array(32));

    return {
      // Pass the underlying ArrayBuffer to the helper
      publicKey: bufferToHex(pkBuffer.buffer),
      privateKey: bufferToHex(skBuffer.buffer),
    };
  },

  /**
   * Encrypts the private key using Key B with AES-GCM
   */
  async encryptPrivateKey(
    privateKeyHex: string,
    keyB: ArrayBuffer,
  ): Promise<EncryptedBundle> {
    const encoder = new TextEncoder();
    const dataToEncrypt = encoder.encode(privateKeyHex);

    // Generate an initialization vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Import KeyB into Web Crypto format for AES-GCM
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      keyB,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      dataToEncrypt,
    );

    return {
      ciphertext: bufferToHex(encryptedBuffer),
      // Pass the underlying ArrayBuffer to the helper
      iv: bufferToHex(iv.buffer),
    };
  },

  /**
   * Decrypts the backup bundle using Key B with AES-GCM
   */
  async encryptMessageForPublicKey(
    message: string,
    publicKeyHex: string,
  ): Promise<EncryptedBundle> {
    const encoder = new TextEncoder();
    const publicKeyBytes = encoder.encode(publicKeyHex);
    const keyMaterial = await window.crypto.subtle.digest(
      "SHA-256",
      publicKeyBytes,
    );
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encoder.encode(message),
    );

    return {
      ciphertext: bufferToHex(encryptedBuffer),
      iv: bufferToHex(iv.buffer),
    };
  },

  async decryptMessageForPublicKey(
    bundle: EncryptedBundle,
    publicKeyHex: string,
  ): Promise<string> {
    const encoder = new TextEncoder();
    const publicKeyBytes = encoder.encode(publicKeyHex);
    const keyMaterial = await window.crypto.subtle.digest(
      "SHA-256",
      publicKeyBytes,
    );
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(hexToBuffer(bundle.iv)) },
      aesKey,
      hexToBuffer(bundle.ciphertext),
    );

    return new TextDecoder().decode(decryptedBuffer);
  },

  async decryptPrivateKey(
    bundle: EncryptedBundle,
    keyB: ArrayBuffer,
  ): Promise<string> {
    const ciphertextBuffer = hexToBuffer(bundle.ciphertext);
    const ivBuffer = hexToBuffer(bundle.iv);

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      keyB,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
      aesKey,
      ciphertextBuffer,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  },
};
