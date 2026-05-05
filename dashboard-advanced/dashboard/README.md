# Dashboard Frontend

React + Vite frontend for the VM Dashboard.

It renders:

- DevSecOps summary cards from `/api/dashboard/summary`, with protected utilization details from `/api/dashboard` after sign-in
- FinOps summary cards from `/api/finops/summary`, with protected details from `/api/finops`
- Text mode from the protected DevSecOps payload, plus `/api/logs` for the all-logs modal
- Quotes from `/data/quotes.json`, staged from `shared/assets/quotes/quotes.json`
- Gallery images from `/data/gallery-manifest.json` and `/data/images/*`, staged from `shared/assets/images/image_gallery`
- Client-side sort, filter, search, and view-all modals for logs, services, and FinOps tables
- Clipboard actions for dashboard snapshots, dashboard JSON payloads, widget snapshots, and JSON System Logs payloads
- A centralized header sign-in menu for Nginx Basic Auth protected dashboard sections, with separate DevSecOps and FinOps sessions

## Local Development

```bash
npm install
npm run dev
```

Access: `http://localhost:5173`

![Local Vite dashboard running at localhost with mock DevSecOps data visible](../docs/assets/03_local_vite_mock_data.png)

The Vite dev server has no proxy configured:

```js
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Put vendor dependencies into separate chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui'
            }
            return 'vendor'
          }
        }
      }
    }
  }
})
```

Because frontend requests use relative paths like `/api/dashboard`, local development falls back to bundled mock data unless the app is served behind Nginx or a local proxy is added.

Local sign-in uses development-only credentials because Vite does not run the VM Nginx Basic Auth layer. Set these values before starting Vite:

```bash
VITE_DASHBOARD_DEV_AUTH_USER=dashboard
VITE_DASHBOARD_DEV_AUTH_PASSWORD=your-local-dev-password
VITE_DASHBOARD_FINOPS_AUTH_USER=finops
VITE_DASHBOARD_FINOPS_AUTH_PASSWORD=your-local-finops-password
```

Production sign-in is enforced by Nginx using hashed password files generated during VM bootstrap from Secret Manager. DevSecOps and FinOps sessions are stored separately in the browser. The header account menu can sign out of the current dashboard or sign out everywhere.

![Dashboard header Sign In dropdown showing DevSecOps and FinOps options](../docs/assets/44_header_sign_in_dropdown.png)

If these variables are omitted in local development, the fallback demo credentials are `dashboard/password` for DevSecOps and `finops/password` for FinOps.

Successful sign-in is remembered in `sessionStorage` for the current browser session, up to 8 hours. This survives page refreshes but is cleared when the browser session ends or when protected API credentials stop working.

In Vite development mode, `/api/logs` is intercepted by `dashboard-advanced/dashboard/src/mockLogs.js` so the log modals can still demonstrate pagination, filtering, sorting, and older-log loading without a live `journalctl` API.

System Logs copy actions intentionally output JSON instead of plain text:

```json
{
  "system_logs": [
    {
      "timestamp": "2026-04-27T14:58:42Z",
      "level": "WARN",
      "component": "storage",
      "message": "Root disk at 92% after npm build artifacts; 4.0 GB free"
    }
  ]
}
```

Header controls include a camera icon for the dashboard snapshot and a `{}` icon for the JSON payload. Text mode mirrors this with `[C] COPY`, `[J] COPY JSON`, and `[LS] SNAPSHOT` inside the all-logs modal. The JSON payload structure is documented in [`docs/API_CONFIG.md`](../docs/API_CONFIG.md#clipboard-json-payload-structure).

![Dashboard header showing snapshot and JSON payload buttons](../docs/assets/04_header_snapshot_json_buttons.png)

## Build

```bash
npm run build
```

The bootstrap script runs this command as `appuser`, then copies `dashboard-advanced/dashboard/dist/*` into `/var/www/vm-dashboard`.

## Build-Time Links

The sidebar links are read from Vite environment variables:

```js
const githubUrl = import.meta.env.VITE_GITHUB_URL || "https://github.com";
const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL || "https://www.linkedin.com";
```

In VM deployments, `dashboard-advanced/scripts/bootstrap/app_bootstrap.sh` exports:

```bash
export VITE_GITHUB_URL="https://github.com/KirkAlton-Class7"
export VITE_LINKEDIN_URL="https://www.linkedin.com/in/kirkcochranjr/"
```

Set these before `npm run build` if you need different links.
