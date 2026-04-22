import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";
import { api } from "../../lib/api";

type AuthMode = "login" | "register" | "forgot" | "reset";

type FormProps = {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function LoginForm({ onSubmit }: FormProps) {
  return (
    <form className="stack" onSubmit={onSubmit}>
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" required /></label>
      <button type="submit" className="primary">Sign in</button>
    </form>
  );
}

function RegisterForm({ onSubmit }: FormProps) {
  return (
    <form className="stack" onSubmit={onSubmit}>
      <label>Email<input name="email" type="email" required /></label>
      <label>Username<input name="username" minLength={3} required /></label>
      <label>Password<input name="password" type="password" minLength={8} required /></label>
      <button type="submit" className="primary">Create account</button>
    </form>
  );
}

function ForgotPasswordForm({ onSubmit }: FormProps) {
  return (
    <form className="stack" onSubmit={onSubmit}>
      <label>Email<input name="email" type="email" required /></label>
      <button type="submit" className="primary">Send reset link</button>
    </form>
  );
}

function ResetPasswordForm(props: {
  resetToken: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="stack" onSubmit={props.onSubmit}>
      <label>Reset token<input value={props.resetToken} disabled /></label>
      <label>New password<input name="password" type="password" minLength={8} required /></label>
      <button type="submit" className="primary">Reset password</button>
    </form>
  );
}

export function AuthGate() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [message, setMessage] = useState("");
  const search = new URLSearchParams(window.location.search);
  const resetToken = search.get("token");

  const login = useMutation({
    mutationFn: (input: { email: string; password: string }) => api.login(input),
    onSuccess: () => window.location.reload()
  });
  const register = useMutation({
    mutationFn: (input: { email: string; username: string; password: string }) => api.register(input),
    onSuccess: () => window.location.reload()
  });
  const forgot = useMutation({
    mutationFn: (email: string) => api.forgotPassword(email)
  });
  const reset = useMutation({
    mutationFn: (password: string) => api.resetPassword(resetToken ?? "", password)
  });

  return (
    <div className="auth-shell">
      <div className="brand-panel">
        <span className="badge">Classic Chat MVP</span>
        <h1>Old-school web chat, modern enough to ship.</h1>
        <p>Public rooms, private invites, direct messages, presence, attachments, moderation, and persistent history.</p>
      </div>
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={clsx({ active: mode === "login" })} onClick={() => setMode("login")}>Sign in</button>
          <button className={clsx({ active: mode === "register" })} onClick={() => setMode("register")}>Register</button>
          <button className={clsx({ active: mode === "forgot" })} onClick={() => setMode("forgot")}>Reset</button>
        </div>

        {mode === "login" && (
          <LoginForm
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              login.mutate({
                email: String(form.get("email")),
                password: String(form.get("password"))
              });
            }}
          />
        )}

        {mode === "register" && (
          <RegisterForm
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              register.mutate({
                email: String(form.get("email")),
                username: String(form.get("username")),
                password: String(form.get("password"))
              });
            }}
          />
        )}

        {mode === "forgot" && (
          <ForgotPasswordForm
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              forgot.mutate(String(form.get("email")), {
                onSuccess: () => setMessage("Reset mail sent to Mailpit")
              });
            }}
          />
        )}

        {resetToken && (
          <ResetPasswordForm
            resetToken={resetToken}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              reset.mutate(String(form.get("password")), {
                onSuccess: () => setMessage("Password updated, sign in now")
              });
            }}
          />
        )}

        <p className="auth-feedback">
          {login.error?.message ?? register.error?.message ?? forgot.error?.message ?? reset.error?.message ?? message}
        </p>
      </div>
    </div>
  );
}
