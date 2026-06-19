import { Mail, Lock } from 'lucide-react'
import Input from '../ui/Input'
import GradientButton from '../ui/GradientButton'
import type { AuthFormErrors, AuthFormState } from '../../types/auth'

interface LoginFormProps {
  formState: AuthFormState
  errors: AuthFormErrors
  isValid: boolean
  isSubmitting?: boolean
  apiError?: string | null
  onFieldChange: <K extends keyof AuthFormState>(
    field: K,
    value: AuthFormState[K],
  ) => void
  onSubmit: () => void
}

export default function LoginForm({
  formState,
  errors,
  isValid,
  isSubmitting = false,
  apiError,
  onFieldChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form
      className="w-full space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      noValidate
    >
      <Input
        id="login-email"
        label="Your email"
        type="email"
        placeholder="Enter your email"
        value={formState.email}
        onChange={(value) => onFieldChange('email', value)}
        leftIcon={<Mail className="h-5 w-5" />}
        autoComplete="email"
        error={errors.email}
      />

      <Input
        id="login-password"
        label="Your password"
        type="password"
        placeholder="Enter your password"
        value={formState.password}
        onChange={(value) => onFieldChange('password', value)}
        leftIcon={<Lock className="h-5 w-5" />}
        autoComplete="current-password"
        error={errors.password}
      />

      {/* Render Crypto/API errors here */}
      {apiError && (
        <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400 border border-red-900/50">
          {apiError}
        </div>
      )}

      <div className="pt-1">
        <GradientButton
          type="submit"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Deriving Keys...' : 'Login'}
        </GradientButton>
      </div>

   
    </form>
  )
}