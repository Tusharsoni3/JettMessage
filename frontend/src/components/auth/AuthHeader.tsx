import type { AuthMode } from '../../types/auth'

interface AuthHeaderProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

export default function AuthHeader({ mode, onModeChange }: AuthHeaderProps) {
  const isLogin = mode === 'login'

  return (
    <header className="mb-12 w-full">
    
      <h1 className="mx-auto mt-5 max-w-full text-center text-[30px] font-bold leading-tight tracking-tight text-white sm:text-[34px]">
        Welcome to Jett Messages
      </h1>

      <p className="mx-auto mt-3 max-w-md text-center text-base text-[#9CA3AF]">
        {isLogin
          ? 'Sign in to access your encrypted conversations.'
          : 'Create an account to start messaging securely.'}
      </p>

      <div className="mt-7 flex w-full gap-4">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className={`flex w-full items-center justify-center rounded-xl border border-[#333333] py-3.5 text-base font-medium transition-all hover:bg-[#1A1A1A] ${
            isLogin
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-transparent text-[#A1A1AA]'
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => onModeChange('signup')}
          className={`flex w-full items-center justify-center rounded-xl border border-[#333333] py-3.5 text-base font-medium transition-all hover:bg-[#1A1A1A] ${
            !isLogin
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-transparent text-[#A1A1AA]'
          }`}
        >
          Sign up
        </button>
      </div>
    </header>
  )
}
