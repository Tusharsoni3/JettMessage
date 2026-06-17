export type AuthMode = 'login' | 'signup'

export interface AuthFormState {
  email: string
  password: string
  confirmPassword: string
}

export interface AuthFormErrors {
  email?: string
  password?: string
  confirmPassword?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials extends LoginCredentials {
  confirmPassword: string
}

export interface AuthSubmitPayload {
  mode: AuthMode
  credentials: LoginCredentials | SignupCredentials
}
