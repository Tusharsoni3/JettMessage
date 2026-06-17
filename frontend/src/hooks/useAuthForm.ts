import { useCallback, useMemo, useState } from 'react'
import type {
  AuthFormErrors,
  AuthFormState,
  AuthMode,
  AuthSubmitPayload,
  LoginCredentials,
  SignupCredentials,
} from '../types/auth'

const INITIAL_STATE: AuthFormState = {
  email: '',
  password: '',
  confirmPassword: '',
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateForm(
  mode: AuthMode,
  state: AuthFormState,
): AuthFormErrors {
  const errors: AuthFormErrors = {}

  if (!state.email.trim()) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(state.email)) {
    errors.email = 'Enter a valid email address'
  }

  if (!state.password) {
    errors.password = 'Password is required'
  } else if (state.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (mode === 'signup' && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(state.password)) {
    // Enforce smart password policy before hitting the crypto engine
    errors.password = 'Requires uppercase, lowercase, number, and special char'
  }

  if (mode === 'signup') {
    if (!state.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (state.confirmPassword !== state.password) {
      errors.confirmPassword = 'Passwords do not match'
    }
  }

  return errors
}

export function useAuthForm(mode: AuthMode) {
  const [formState, setFormState] = useState<AuthFormState>(INITIAL_STATE)
  const [errors, setErrors] = useState<AuthFormErrors>({})
  const [touched, setTouched] = useState(false)

  const updateField = useCallback(
    <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      if (touched) {
        setErrors(validateForm(mode, { ...formState, [field]: value }))
      }
    },
    [formState, mode, touched],
  )

  const resetForm = useCallback(() => {
    setFormState(INITIAL_STATE)
    setErrors({})
    setTouched(false)
  }, [])

  const validationErrors = useMemo(
    () => validateForm(mode, formState),
    [formState, mode],
  )

  const isValid = useMemo(
    () => Object.keys(validationErrors).length === 0,
    [validationErrors],
  )

  const buildPayload = useCallback((): AuthSubmitPayload | null => {
    const nextErrors = validateForm(mode, formState)
    setErrors(nextErrors)
    setTouched(true)

    if (Object.keys(nextErrors).length > 0) return null

    if (mode === 'login') {
      const credentials: LoginCredentials = {
        email: formState.email.trim(),
        password: formState.password,
      }
      return { mode, credentials }
    }

    const credentials: SignupCredentials = {
      email: formState.email.trim(),
      password: formState.password,
      confirmPassword: formState.confirmPassword,
    }
    return { mode, credentials }
  }, [formState, mode])

  return {
    formState,
    errors: touched ? errors : {},
    validationErrors,
    isValid,
    updateField,
    resetForm,
    buildPayload,
    setTouched,
  }
}