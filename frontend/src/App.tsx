import AuthScreen from './components/auth/AuthScreen'
import type { AuthSubmitPayload } from './types/auth'

function App() {
  const handleAuthSubmit = async (payload: AuthSubmitPayload) => {
    // Ready to wire into JWT backend:
    // POST /api/auth/login  or  POST /api/auth/register
    console.log('Auth payload ready for API:', payload)
  }

  return <AuthScreen onSubmit={handleAuthSubmit} />
}

export default App
