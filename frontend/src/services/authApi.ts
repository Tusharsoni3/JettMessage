import axios from 'axios';

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

const apiClient = axios.create({
  baseURL : "http://localhost:3000",
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Changed this to return an Error instead of throwing it directly
const extractApiError = (error: unknown, defaultMessage: string): Error => {
  if (axios.isAxiosError(error)) {
    return new Error(error.response?.data?.message || defaultMessage);
  }
  return new Error(defaultMessage);
};

export const authApi = {
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', payload);
      return response.data; 
    } catch (error) {
      // 2. Explicitly throw here so TypeScript knows this branch terminates
      throw extractApiError(error, 'Signup request failed');
    }
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', payload);
      return response.data;
    } catch (error) {
      // 2. Explicitly throw here as well
      throw extractApiError(error, 'Login request failed');
    }
  }
};