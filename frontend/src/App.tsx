import { useEffect, useState } from "react";
import AuthScreen from "./components/auth/AuthScreen";
import Dashboard from "./components/dashboard/Dashboard";
import { authApi, type AuthUser } from "./services/authApi";

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    authApi
      .me()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setCheckingSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-black text-white">
        Checking session...
      </div>
    );
  }

  if (user) {
    return (
      <Dashboard
        user={user}
        onLogout={() => {
          setUser(null);
          window.history.replaceState(null, "", "/");
        }}
      />
    );
  }

  return <AuthScreen />;
}

export default App;
