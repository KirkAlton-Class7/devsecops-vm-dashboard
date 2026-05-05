import { Camera } from "lucide-react";
import { writeClipboardText } from "../utils/clipboard";

export default function Card({
  title,
  subtitle,
  children,
  className = "",
  snapshotText,
  snapshotLabel = "widget snapshot",
  onCopyFailure,
  onCopySuccess,
}) {
  const handleCopySnapshot = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await writeClipboardText(snapshotText);
      onCopySuccess?.("Widget snapshot copied to clipboard.");
    } catch (error) {
      console.error(`Failed to copy ${snapshotLabel}:`, error);
      onCopyFailure?.(snapshotText, snapshotLabel);
    }
  };

  return (
    <section
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 ${className}`}
    >
      {/* Animated border gradient on hover */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />
      
      {/* Background glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-cyan-500/5 to-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500/5 to-pink-600/5 rounded-full blur-3xl"></div>
      </div>

      {snapshotText && (
        <button
          type="button"
          onClick={handleCopySnapshot}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-950/80 text-slate-400 opacity-0 shadow-lg backdrop-blur-sm transition-all hover:border-cyan-300/50 hover:text-cyan-200 group-hover:opacity-100 focus-visible:opacity-100"
          title={`Copy ${snapshotLabel}`}
          aria-label={`Copy ${snapshotLabel}`}
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      )}
      
      {/* Card header */}
      {(title || subtitle) && (
        <div className="relative border-b border-white/10 px-6 py-4 group-hover:border-white/20 transition-colors duration-300">
          {title && (
            <h2
              className="text-sm font-semibold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent"
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Card content */}
      <div className="relative p-6">{children}</div>
      
      {/* Decorative corner with animation */}
      <div
        className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none"
      >
        <div className="absolute bottom-0 right-0 w-12 h-12 rounded-tl-full bg-gradient-to-tl from-white/5 to-transparent"></div>
      </div>
      
      {/* Bottom accent line on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-purple-600/0"
      />
    </section>
  );
}
