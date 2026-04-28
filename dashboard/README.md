# Dashboard Frontend

React + Vite frontend for the VM Dashboard.

It renders:

- DevSecOps mode from `/api/dashboard`
- FinOps mode from `/api/finops`
- Text mode from the same DevSecOps payload, plus `/api/logs` for the all-logs modal
- Quotes from `/data/quotes.json`
- Gallery images from `/data/images.json` and `/data/images/*`
- Client-side sort, filter, search, and view-all modals for logs, services, and FinOps tables

## Local Development

```bash
npm install
npm run dev
```

Access: `http://localhost:5173`

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

Because frontend requests use relative paths like `/api/dashboard`, local development falls back to bundled mock data unless the app is served behind NGINX or a local proxy is added.

In Vite development mode, `/api/logs` is intercepted by `dashboard/src/mockLogs.js` so the log modals can still demonstrate pagination, filtering, sorting, and older-log loading without a live `journalctl` API.

## Build

```bash
npm run build
```

The bootstrap script runs this command as `appuser`, then copies `dashboard/dist/*` into `/var/www/vm-dashboard`.

## Build-Time Links

The sidebar links are read from Vite environment variables:

```js
const githubUrl = import.meta.env.VITE_GITHUB_URL || "https://github.com";
const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL || "https://www.linkedin.com";
```

In VM deployments, `scripts/bootstrap/app_bootstrap.sh` exports:

```bash
export VITE_GITHUB_URL="https://github.com/KirkAlton-Class7"
export VITE_LINKEDIN_URL="https://www.linkedin.com/in/kirkcochranjr/"
```

Set these before `npm run build` if you need different links.
