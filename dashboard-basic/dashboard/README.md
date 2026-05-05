# Basic VM Dashboard Frontend

React + Vite frontend for the Basic VM Dashboard.

It renders:

- CPU, memory, disk, and estimated cost cards using the same `StatCard` presentation as the advanced DevSecOps dashboard
- The same DevSecOps-style header, sidebar, card chrome, snapshot buttons, toast, and Manual Copy fallback behavior
- VM identity, network, and location details
- Basic system resources
- Local service health
- Local monitoring endpoints
- Featured quote, screensaver, and Scenes from Around the World cards backed by shared static assets
- Text Mode with keyboard controls for refresh, plain-text snapshot copy, JSON payload copy, help, and exit

It does not include FinOps, logs, protected sign-in flows, or load trend widgets.

## Local Development

```bash
npm install
npm run dev
```

Access:

```text
http://localhost:5173
```

In local Vite development, `/api/dashboard` is usually unavailable unless you run the Python API separately or add a proxy, so the UI falls back to bundled mock data.

The image gallery first attempts to load `/data/gallery-manifest.json`. If that runtime file is unavailable during local development, it falls back to the shared repository assets under `shared/assets/images/image_gallery` so the gallery still displays images.

Text Mode is available from the header mode selector or the `T` key. Press `B` or `Escape` to return to the standard Basic dashboard.

## Build

```bash
npm run build
```

The bootstrap script runs this command as `appuser`, then copies `dashboard-basic/dashboard/dist/*` into:

```text
/var/www/basic-vm-dashboard
```
