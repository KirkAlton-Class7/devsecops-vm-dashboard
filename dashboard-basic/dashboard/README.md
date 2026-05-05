# Basic VM Dashboard Frontend

React + Vite frontend for the Basic VM Dashboard.

It renders:

- CPU, memory, disk, and uptime cards
- VM identity, network, and location details
- Basic system resources
- Local service health
- Local monitoring endpoints

It does not include FinOps, logs, text mode, protected sign-in flows, or load trend widgets.

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

## Build

```bash
npm run build
```

The bootstrap script runs this command as `appuser`, then copies `dashboard-basic/dashboard/dist/*` into:

```text
/var/www/basic-vm-dashboard
```
