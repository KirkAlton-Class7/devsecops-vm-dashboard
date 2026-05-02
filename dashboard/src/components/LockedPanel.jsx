import { LockKeyhole } from "lucide-react";

export default function LockedPanel({
  title = "Protected section",
  message = "Protected data is protected. Sign in to view.",
  onSignIn,
}) {
  return (
    <div className="rounded-xl border border-cyan-300/20 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-2 text-cyan-200">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          className="inline-flex items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
