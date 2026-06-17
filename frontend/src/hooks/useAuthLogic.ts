import { useState } from 'react';
import { cryptoService } from '../services/cryptoService';
import { dbService } from '../services/dbService';
import { authApi } from '../services/authApi';

export const useAuthLogic = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Executes the full Zero-Knowledge Zero-Trust Signup Pipeline
   */
  const handleSignup = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Derive Key A (Auth) and Key B (Padlock)
      const { keyA, keyB } = await cryptoService.deriveAndSplitPassword(password, email);

      // 2. Generate Post-Quantum Kyber Keypair
      const keyPair = await cryptoService.generateMLKEMKeyPair();

      // 3. Encrypt Private Key with Key B to create backup bundle
      const encryptedBundle = await cryptoService.encryptPrivateKey(keyPair.privateKey, keyB);
        console.log('--- E2EE SIGNUP PAYLOAD ---');
console.log('Email:', email);
console.log('Key A (Auth Token to Server):', keyA);
console.log('Public Key (To Server):', keyPair.publicKey);
console.log('Encrypted Bundle (To Server):', encryptedBundle);
console.log('Raw Private Key (STAYS LOCAL):', keyPair.privateKey);
      // 4. Send payload safely to backend database
      await authApi.signup({
        email,
        keyA,
        publicKey: keyPair.publicKey,
        encryptedBackupBundle: encryptedBundle,
      });

      // 5. Store active master private key locally in IndexedDB
      await dbService.saveMasterPrivateKey(keyPair.privateKey);

      // 6. Success! Redirect logic or update context can be triggered here
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      // Strictly typed error handling to satisfy ESLint
      setError(err instanceof Error ? err.message : 'An error occurred during secure signup.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Executes the Standard Login Device-Reconstruction Pipeline
   */
  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Derive local instances of Key A and Key B using the credentials
      const { keyA, keyB } = await cryptoService.deriveAndSplitPassword(password, email);

      // 2. Authenticate against server using Key A
      const response = await authApi.login({ email, keyA });

      if (!response.encryptedBackupBundle) {
        throw new Error('Server response missing expected encryption bundle.');
      }

      // 3. Decode backup bundle locally using local derived Key B
      const decryptedPrivateKey = await cryptoService.decryptPrivateKey(
        response.encryptedBackupBundle,
        keyB
      );

      // 4. Save original private key safely into IndexedDB container
      await dbService.saveMasterPrivateKey(decryptedPrivateKey);

      // 5. Complete transition
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      // Strictly typed error handling to satisfy ESLint
      setError(err instanceof Error ? err.message : 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return {
    handleSignup,
    handleLogin,
    loading,
    error,
  };
};