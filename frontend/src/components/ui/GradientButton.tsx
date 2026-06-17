import { ArrowRight } from 'lucide-react'

interface GradientButtonProps {
  children: React.ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}

export default function GradientButton({
  children,
  disabled = false,
  type = 'button',
  onClick,
}: GradientButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-xl py-4 text-base font-semibold transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed bg-[#1F1F1F] text-[#6B7280]'
          : 'bg-gradient-to-r from-[#FF6B35] via-[#FF4D6D] to-[#E91E8C] text-white shadow-[0_0_24px_rgba(255,77,109,0.35)] hover:shadow-[0_0_32px_rgba(255,77,109,0.5)] hover:brightness-110 active:brightness-95'
      }`}
    >
      <span className="flex items-center justify-center gap-1.5">
        {children}
        {!disabled && (
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        )}
      </span>
    </button>
  )
}
