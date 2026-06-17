import { useCallback, useEffect, useState } from 'react'
import type { AuthMode } from '../../types/auth'
import { useAuthForm } from '../../hooks/useAuthForm'
import { useAuthLogic } from '../../hooks/useAuthLogic'
import AuthHeader from './AuthHeader'
import AuthFooter from './AuthFooter'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login')

  // UI Form State
  const {
    formState,
    errors,
    validationErrors,
    isValid,
    updateField,
    resetForm,
    buildPayload,
  } = useAuthForm(mode)

  // Core Cryptographic & API State
  const { 
    handleLogin, 
    handleSignup, 
    loading: cryptoLoading, 
    error: cryptoError 
  } = useAuthLogic()

  useEffect(() => {
    resetForm()
  }, [mode, resetForm])

  const handleModeChange = useCallback((nextMode: AuthMode) => {
    setMode(nextMode)
  }, [])

  const handleSubmit = useCallback(async () => {
    const payload = buildPayload()
    if (!payload) return

    if (payload.mode === 'login') {
      await handleLogin(payload.credentials.email, payload.credentials.password)
    } else if (payload.mode === 'signup') {
      await handleSignup(payload.credentials.email, payload.credentials.password)
    }
  }, [buildPayload, handleLogin, handleSignup])

  return (
    <div className="flex min-h-svh flex-col bg-black">
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-6 pt-16 sm:max-w-[520px] sm:px-8 sm:pt-20">
        <AuthHeader mode={mode} onModeChange={handleModeChange} />

        {mode === 'login' ? (
          <LoginForm
            formState={formState}
            errors={errors}
            isValid={isValid}
            isSubmitting={cryptoLoading}
            apiError={cryptoError}
            onFieldChange={updateField}
            onSubmit={handleSubmit}
          />
        ) : (
          <SignupForm
            formState={formState}
            errors={errors}
            validationErrors={validationErrors}
            isValid={isValid}
            isSubmitting={cryptoLoading}
            apiError={cryptoError}
            onFieldChange={updateField}
            onSubmit={handleSubmit}
          />
        )}
      </main>

      <AuthFooter />
    </div>
  )
}