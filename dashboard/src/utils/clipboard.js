const HTTP_TEST_KEY = "vm_dashboard_http_test";
const LOCAL_TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalTestHost() {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  return LOCAL_TEST_HOSTS.has(window.location.hostname);
}

export function isManualCopyTestMode() {
  if (typeof window === "undefined") return false;
  if (!isLocalTestHost()) return false;
  if (import.meta.env.VITE_FORCE_MANUAL_COPY === "true") return true;

  const params = new URLSearchParams(window.location.search);
  return (
    params.get("HttpTest") === "1" ||
    localStorage.getItem(HTTP_TEST_KEY) === "true"
  );
}

export async function writeClipboardText(text) {
  if (isManualCopyTestMode()) {
    throw new Error("Manual copy test mode enabled");
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API unavailable");
  }

  await navigator.clipboard.writeText(String(text ?? ""));
}
