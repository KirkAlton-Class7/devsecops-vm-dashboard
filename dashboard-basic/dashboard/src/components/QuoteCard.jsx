import { Check, Copy, Quote, RefreshCw } from "lucide-react";
import { useState } from "react";
import Card from "./Card";
import { writeClipboardText } from "../utils/clipboard";

export default function QuoteCard({ quote, quotes = [], onQuoteChange }) {
  const [copied, setCopied] = useState(false);

  const handleRefresh = () => {
    if (!quotes.length) return;
    const nextIndex = Math.floor(Math.random() * quotes.length);
    onQuoteChange?.(quotes[nextIndex]);
  };

  const handleCopy = async () => {
    const text = `"${quote?.text || ""}"\n- ${quote?.author || "Basic VM Dashboard"}`;
    await writeClipboardText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card title="Featured Quote" subtitle="A small operational nudge">
      <div className="relative">
        <Quote className="mb-4 h-8 w-8 text-cyan-300/60" />
        <blockquote className="text-base leading-7 text-slate-200">
          "{quote?.text}"
        </blockquote>
        <footer className="mt-4 text-sm text-slate-400">
          - {quote?.author || "Basic VM Dashboard"}
        </footer>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            title="Copy quote"
            aria-label="Copy quote"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
            title="Refresh quote"
            aria-label="Refresh quote"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
