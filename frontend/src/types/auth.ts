export type AuthMode = "login" | "signup";

export interface AuthFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
  confirmPassword: string;
}

export type AuthSubmitPayload =
  | { mode: "login"; credentials: LoginCredentials }
  | { mode: "signup"; credentials: SignupCredentials };
