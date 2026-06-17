export interface SignupPayload {
  email: string;
  keyA: string;
  publicKey: string;
  encryptedBackupBundle: {
    ciphertext: string;
    iv: string;
  };
}

export interface LoginPayload {
  email: string;
  keyA: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  encryptedBackupBundle?: {
    ciphertext: string;
    iv: string;
  };
}

export const authApi = {
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Signup request failed');
    }
    return response.json();
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login request failed');
    }
    return response.json();
  }
};