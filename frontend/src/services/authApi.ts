import axios from "axios";

export interface SignupPayload {
  name: string;
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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  publicKey: string;
}

export type SearchUser = AuthUser;

export interface ConversationResponse {
  success: boolean;
  conversationId: string;
  recipient: SearchUser;
}

export interface ConversationListItem {
  conversationId: string;
  recipient: SearchUser;
  lastMessage: EncryptedMessage | null;
}

export interface EncryptedMessagePayload {
  conversationId: string;
  receiverCiphertext: string;
  receiverIv: string;
  senderCiphertext: string;
  senderIv: string;
}

export interface EncryptedMessage extends EncryptedMessagePayload {
  id: string;
  senderId: string;
  status: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
  encryptedBackupBundle?: {
    ciphertext: string;
    iv: string;
  };
}

const apiClient = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
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
      const response = await apiClient.post<AuthResponse>(
        "/api/auth/register",
        payload,
      );
      return response.data;
    } catch (error) {
      // 2. Explicitly throw here so TypeScript knows this branch terminates
      throw extractApiError(error, "Signup request failed");
    }
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        "/api/auth/login",
        payload,
      );
      return response.data;
    } catch (error) {
      // 2. Explicitly throw here as well
      throw extractApiError(error, "Login request failed");
    }
  },

  async me(): Promise<AuthUser> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        user: AuthUser;
      }>("/api/auth/me");
      return response.data.user;
    } catch (error) {
      throw extractApiError(error, "Not authenticated");
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/auth/logout");
    } catch (error) {
      throw extractApiError(error, "Logout failed");
    }
  },
};

export const chatApi = {
  async listConversations(): Promise<ConversationListItem[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        conversations: ConversationListItem[];
      }>("/api/conversations");
      return response.data.conversations;
    } catch (error) {
      throw extractApiError(error, "Failed to load conversations");
    }
  },

  async createOrGetConversation(
    recipientId: string,
  ): Promise<ConversationResponse> {
    try {
      const response = await apiClient.post<ConversationResponse>(
        "/api/conversations",
        { recipientId },
      );
      return response.data;
    } catch (error) {
      throw extractApiError(error, "Failed to start conversation");
    }
  },

  async sendMessage(
    payload: EncryptedMessagePayload,
  ): Promise<EncryptedMessage> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: EncryptedMessage;
      }>("/api/messages", payload);
      return response.data.message;
    } catch (error) {
      throw extractApiError(error, "Failed to send message");
    }
  },

  async getMessages(conversationId: string): Promise<EncryptedMessage[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        messages: EncryptedMessage[];
      }>(`/api/messages/${conversationId}`);
      return response.data.messages;
    } catch (error) {
      throw extractApiError(error, "Failed to load messages");
    }
  },
};

export const userApi = {
  async searchUsers(query: string): Promise<SearchUser[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        users: SearchUser[];
      }>(`/api/users/search?q=${encodeURIComponent(query)}`);
      return response.data.users;
    } catch (error) {
      throw extractApiError(error, "User not found");
    }
  },

  async searchUser(name: string): Promise<SearchUser> {
    const users = await this.searchUsers(name);
    if (!users[0]) {
      throw new Error("User not found");
    }
    return users[0];
  },
};
