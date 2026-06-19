import { Mail, Lock, User } from "lucide-react";
import Input from "../ui/Input";
import GradientButton from "../ui/GradientButton";
import type { AuthFormErrors, AuthFormState } from "../../types/auth";

interface SignupFormProps {
  formState: AuthFormState;
  errors: AuthFormErrors;
  validationErrors: AuthFormErrors;
  isValid: boolean;
  isSubmitting?: boolean;
  apiError?: string | null;
  onFieldChange: <K extends keyof AuthFormState>(
    field: K,
    value: AuthFormState[K],
  ) => void;
  onSubmit: () => void;
}

export default function SignupForm({
  formState,
  errors,
  validationErrors,
  isValid,
  isSubmitting = false,
  apiError,
  onFieldChange,
  onSubmit,
}: SignupFormProps) {
  return (
    <form
      className="w-full space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <Input
        id="signup-name"
        label="Your name"
        type="text"
        placeholder="Enter your name"
        value={formState.name}
        onChange={(value) => onFieldChange("name", value)}
        leftIcon={<User className="h-5 w-5" />}
        autoComplete="name"
        error={errors.name}
      />

      <Input
        id="signup-email"
        label="Your email"
        type="email"
        placeholder="Enter your email"
        value={formState.email}
        onChange={(value) => onFieldChange("email", value)}
        leftIcon={<Mail className="h-5 w-5" />}
        autoComplete="email"
        error={errors.email}
      />

      <Input
        id="signup-password"
        label="Your password"
        type="password"
        placeholder="Create a strong password"
        value={formState.password}
        onChange={(value) => onFieldChange("password", value)}
        leftIcon={<Lock className="h-5 w-5" />}
        autoComplete="new-password"
        // 3. Switch to live validation once they start typing
        error={
          formState.password.length > 0
            ? validationErrors.password
            : errors.password
        }
      />

      <Input
        id="signup-confirm-password"
        label="Confirm password"
        type="password"
        placeholder="Re-enter your password"
        value={formState.confirmPassword}
        onChange={(value) => onFieldChange("confirmPassword", value)}
        leftIcon={<Lock className="h-5 w-5" />}
        autoComplete="new-password"
        // 4. Switch to live validation once they start typing
        error={
          formState.confirmPassword.length > 0
            ? validationErrors.confirmPassword
            : errors.confirmPassword
        }
      />

      {/* Render Crypto/API errors here */}
      {apiError && (
        <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400 border border-red-900/50">
          {apiError}
        </div>
      )}

      <div className="pt-1">
        <GradientButton type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Generating Identity..." : "Create account"}
        </GradientButton>
      </div>
    </form>
  );
}
