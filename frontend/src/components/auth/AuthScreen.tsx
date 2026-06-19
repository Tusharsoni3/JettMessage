import { useCallback, useEffect, useState } from "react";
import type { AuthMode } from "../../types/auth";
import { useAuthForm } from "../../hooks/useAuthForm";
import { useAuthLogic } from "../../hooks/useAuthLogic";
import AuthHeader from "./AuthHeader";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");

  // UI Form State
  const {
    formState,
    errors,
    validationErrors,
    isValid,
    updateField,
    resetForm,
    buildPayload,
  } = useAuthForm(mode);

  // Core Cryptographic & API State
  const {
    handleLogin,
    handleSignup,
    loading: cryptoLoading,
    error: cryptoError,
  } = useAuthLogic();

  useEffect(() => {
    resetForm();
  }, [mode, resetForm]);

  const handleModeChange = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
  }, []);

  const handleSubmit = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;

    if (payload.mode === "login") {
      await handleLogin(
        payload.credentials.email,
        payload.credentials.password,
      );
    } else if (payload.mode === "signup") {
      await handleSignup(
        payload.credentials.name,
        payload.credentials.email,
        payload.credentials.password,
      );
    }
  }, [buildPayload, handleLogin, handleSignup]);

  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center bg-[#1A1A1A] bg-cover bg-center px-6 py-12 sm:px-8"
      style={{ backgroundImage: "url(/bgimg.jpg)" }}
    >
      {/* Dark overlay so the form stays readable over the photo */}
      <div className="absolute inset-0 bg-[#1A1A1A]/75" />

      <main className="relative z-10 mx-auto flex w-full max-w-[480px] flex-col sm:max-w-[520px]">
        <AuthHeader mode={mode} onModeChange={handleModeChange} />

        {mode === "login" ? (
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
    </div>
  );
}