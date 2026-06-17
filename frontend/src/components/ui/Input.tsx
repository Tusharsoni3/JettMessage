import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  value: string
  onChange: (value: string) => void
  leftIcon?: React.ReactNode
  autoComplete?: string
  error?: string
}

export default function Input({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  leftIcon,
  autoComplete,
  error,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2.5 block text-base font-medium text-white"
      >
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            {leftIcon}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border bg-[#1A1A1A] py-4 text-base text-white placeholder:text-[#6B7280] transition-colors focus:outline-none focus:ring-1 ${
            leftIcon ? 'pl-12' : 'pl-4'
          } ${isPassword ? 'pr-12' : 'pr-4'} ${
            error
              ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/30'
              : 'border-[#2E2E2E] focus:border-[#4B4B4B] focus:ring-[#4B4B4B]/40'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-white"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
