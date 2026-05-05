import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LockKeyhole, X } from "lucide-react";

export default function AuthModal({
  open,
  title = "Sign in",
  message = "Sign in to view protected dashboard data.",
  error = "",
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    onSubmit?.({ username, password });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <motion.form
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        onSubmit={submit}
        className="w-[min(92vw,26rem)] rounded-xl border border-cyan-300/25 bg-slate-950/95 text-slate-100 shadow-2xl shadow-cyan-950/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-2 text-cyan-200">
              <LockKeyhole className="h-4 w-4" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-sm font-semibold text-cyan-100">
                {title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-cyan-300/40 hover:text-cyan-200"
            title="Close sign in"
            aria-label="Close sign in"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Username
            </span>
            <input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-300"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-300"
              required
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
