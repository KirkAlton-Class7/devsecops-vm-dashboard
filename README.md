# DevSecOps Cloud Dashboard

## Version v1.1-dev

A real-time infrastructure monitoring dashboard that automatically deploys on **GCP, AWS, Azure**, or any Linux VM. It provides system metrics (CPU, memory, disk, network), estimated cost and other helpful information. The dashboard also integrates widgets with inspirational quotes, custom screen savers, and an international photo gallery.

---

## Features

- **Multi-Cloud Support**: Runs on GCP, AWS, Azure, or any Linux VM
- **Zero External Services**: No managed monitoring stack required
- **Real-Time Metrics**: CPU, memory, disk, and network usage
- **Dynamic Metadata Detection**: Pulls instance data from cloud metadata services
- **Cost Estimation Engine**: Lightweight, heuristic-based _(in development)_
- **Static Asset Delivery**: Quotes (GitHub-synced) and photo gallery (Python-generated metadata) served via NGINX
- **Health Check Endpoint**: `/healthz` for monitoring
- **Metadata API**: Python-based service exposing VM metadata as JSON
- **Text Dashboard Mode**: Terminal-style view for metrics, services, and logs
- **Automatic Re-Deployment** An auto-deploy cron job runs every 15 minutes to detect changes in the repository.
  If changes are found, it pulls the latest code, rebuilds the application, and redeploys the updated files.

---

## Cloud Provider Status

### GCP (Recommended)

- Full feature support
- Stable metadata integration
- All dashboard fields populate correctly

### Azure

> [!WARNING]
> Partial metadata support. Experiences inconsistent responses.

> [!BUG]
>
> - Instance ID unreliable
> - Machine type missing or incorrect
> - Subnet not consistently resolved
> - Region / zone parsing inconsistent
> - Uptime calculation may drift

### AWS

> [!WARNING]
> Deployment is unstable and not currently supported. Under active development.

---

## Future Improvements

- Updated scripts for providers (AWS, GCP, Azure), including:
  - AWS compatibility
  - Provider adapters for metadata normalization
  - Billing API integration (AWS, GCP, Azure)
- Persistent storage for historical metrics
- More accurate uptime and lifecycle tracking

---

## Quick Start

> [!IMPORTANT]
> Deployment is fully automated using a startup script (user-data / startup script).

### Steps

1. Copy the appropriate bootstrap script into your VM:
   - infra/startup/startup.sh

2. Launch a VM
   - Ubuntu 20.04 / 22.04 recommended
   - Works on Amazon Linux 2 / 2023

3. Wait 5–10 minutes while:
   - startup.sh
     - installs dependencies
     - clones this repo (shallow clone, most recent commit)
     - starts monitoring server on port **8080**
     - fetches bootsrap.sh to install dashboard application
   - bootstrap.sh
     - installs dependencies
     - builds React app
     - starts NGINX on port **80**
     - serves app and health endpoint on port **80**

> [!NOTE]
> Logs are written to `/var/log/bootstrap.log` for troubleshooting.

> [!NOTE]
> When changes are made to `scripts/bootstrap/app_bootstrap.sh` and pushed to the repo, they are automatically applied to the dashboard application via cron job.

4. Open the VM’s public IP in your browser to view the dashboard

> [!NOTE]
> After the VM starts, the dashboard may take up to 10 minutes to fully populate estimated cost, images, and other dynamic widgets.

---

## Health Check & Metadata Endpoints

The dashboard exposes two endpoints:

### `/healthz`

- **`/healthz`** returns HTTP 200 (`OK`), served by NGINX.

> [!NOTE]
> `/healthz` only confirms NGINX is running and properly configured. It does not verify dashboard health or backend services.

### `/metadata`

- **`/metadata`** returns JSON with instance metadata (ID, hostname, machine type, IPs).

```JSON
{
"instance_id": "7002567428969658710",
"hostname": "vm-dashboard.us-south1-c.c.dev-project.internal",
"machine_type": "e2-medium",
"internal_ip": "10.206.0.55",
"external_ip": "34.174.11.248"
}
```

> [!NOTE]
> The metadata service runs as `monitoring.service` and starts automatically on boot.

### Test Endpoints

```bash
curl http://<YOUR_VM_IP>/healthz
curl http://<YOUR_VM_IP>/metadata
```

---

## Text Dashboard Mode

A minimalist, terminal-style view of all metrics, services, and logs.

### How to Use

1. Click **TEXT MODE** (top-right)
2. Interface switches to monospace layout
3. Press `Esc` or click `[Esc] EXIT` to return

### Keyboard Shortcuts

| Key   | Action                  |
| ----- | ----------------------- |
| `Esc` | Exit text mode          |
| `C`   | Copy snapshot           |
| `R`   | Refresh                 |
| `H`   | Toggle help             |
| `L`   | Cycle logs (5 → 30)     |
| `S`   | Cycle services (3 → 30) |

> [!TIP]
> Preferences for service and log cycles are saved in `localStorage` so they carry over between modes and sessions.

---

### Variables

You can easily edit the following variables to customize your deployment.

```bash
DASHBOARD_APP_NAME="My Dashboard"
DASHBOARD_TAGLINE="Real-time monitoring for production"
DASHBOARD_USER="Your Name"
DASHBOARD_NAME="DevOps Dashboard"
```

### Apply Changes

1. Edit variables
2. Commit and push
3. Auto-deploy updates within 15 minutes

---

## Forking & Using Your Own Repo

> [!IMPORTANT]
> Required for custom dashboards or forks.

### Steps

1. Fork the repository
2. Update:

```bash
REPO_URL="https://github.com/your-username/your-repo.git"
```

3. Update clone command:

```bash
git clone https://github.com/your-username/your-repo.git /opt/deploy
```

4. Optional:

```bash
GITHUB_QUOTES_URL="..."
```

> [!WARNING]
> Do not modify repository structure, file names, or code layout.
> JSON files must preserve the same schema (identical keys and structure); values may be modified, but must retain their original data types.

### Required Structure

```
dashboard/
scripts/bootstrap/app_bootstrap.sh
images/
images.json
```

---

## Cloud Provider Support

| Provider | Metadata           | Metrics               | Auto-deploy  |
| -------- | ------------------ | --------------------- | ------------ |
| GCP      | Metadata server    | `/proc`, `free`, `df` | cron         |
| AWS      | 169.254.169.254    | same                  | cron         |
| Azure    | 169.254.169.254    | same                  | cron         |
| Local VM | fallback detection | same                  | if available |

> [!NOTE]
> No cloud-specific code required.

---

## Local Development

### Clone Repo

```bash
git clone https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git
cd devsecops-vm-dashboard/dashboard
```

### Run App

```bash
npm install
npm run dev
```

Access:

```
http://localhost:5173
```

### Serve Data

```bash
npx serve data -p 3000
```

---

## Repository Structure

```
devsecops-vm-dashboard/
├── dashboard/               # React frontend (Vite + Tailwind)
├── images/                  # Gallery images
├── images.json              # Image metadata
├── quotes.json              # Featured quotes
├── scripts/bootstrap/
│   └── app_bootstrap.sh     # Application Deployment script
├── monitoring_server.py     # Metadata server
├── fetch_pricing.py         # Pricing function and cost estimation logic
└── README.md
```

---

## Auto-deploy

> [!IMPORTANT]
> Runs every **15 minutes** via cron.

### Process

- `git pull`
- Sync images and `images.json`
- Rebuild React app
- Reload NGINX

### Disable

Edit:

```bash
app_bootstrap.sh
```

Search for:

```bash
dashboard-deploy.sh
```

---

## Important Notes

### Cost Estimation Disclaimer

> [!NOTE]
> Cost values are approximate and based on static assumptions and runtime heuristics.
> Use your cloud provider’s billing APIs or dashboards for accurate data.

### Clipboard Features (`copy`)

> [!NOTE]
> Clipboard features like `copy` require **HTTPS or localhost**.
> When running the dashboard via `http` (public IP), the copy buttons on widgets are unresponseive.

**Workarounds:**

- Manually hilight and copy displayed text
- Deploy the application with HTTPS + SSL Certificate (NGINX + Let’s Encrypt)
- Access the dashboard via `http://localhost` on the VM
- Use a localhost tunnel (e.g. `ngrok`) to access the dashboard via `http` on your local machine.

### Cloud Metadata

Metadata is pulled from provider endpoints.
AWS and Azure may return incomplete or inconsistent data. This does not impact core functionality.

---

## License

MIT license. Free to use, modify, and distribute.

---

## Source

Original README:
