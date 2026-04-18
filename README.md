---

# DevSecOps Cloud Dashboard

## Version v1.2-dev

A real‑time infrastructure monitoring dashboard that deploys automatically on **GCP, AWS, Azure**, or any Linux VM. It provides live system metrics, cost estimates, a particle screensaver, an international photo gallery, inspirational quotes, and a terminal‑style text mode – all without external monitoring services.

---

## Features Menu

### Overview

* Four interactive summary cards:

  * **CPU Usage** – current percentage with color‑coded health status
  * **Memory Usage** – real‑time memory consumption
  * **Disk Usage** – root partition utilisation
  * **Estimated Cost** – heuristic, cloud‑specific running cost (approximate)

* Each card updates every 10 seconds via the live API.

* **Cards are clickable**:
  * **CPU / Memory / Disk** → GCP Compute Engine instance details page
  * **Estimated Cost** → GCP Billing overview for the project
  * **Optimize button** (appears on the Cost card when a billing account ID is available) → opens the FinOps Hub for cost zation

---

### Load

* **System Load (1m)** – current load average
* **Trend Chart** – bar graph of the last 10 load samples (each sample taken every 10 seconds)
* **Detailed insights**:

  * Peak load over the last 10 readings
  * Average load
  * Color‑coded status (Normal, Elevated, High, Critical)
* The chart automatically rescales to the peak load (capped at 5.0).

---

### Ambience

Aesthetic and atmospheric widgets that add character to the dashboard:

* **Featured Quote** – view inspirational quotes (refreshes every 10 seconds, sourced from `quotes.json`; GitHub‑synced every 10 minutes)
* **Screensaver** – interactive particle background. Click to cycle through three modes:

  * *Drift*: drifting cyan particles with connecting lines
  * *Haze*: kinetic purple particles that randomly settle into one of three geometric quilt patterns
  * *State*: white static particles that glow and snap to new positions every 8 seconds, with an imploding glow and subtle settle wiggle
* **International Photo Gallery** – images from around the world, dynamically generated from the `/images` folder. Each image includes a title, location, and photographer credit.

---

### VM Information

Grouped into three compact cards:

* **Identity**

  * Project ID
  * Instance ID
  * Instance Name
  * Hostname
  * Machine Type

* **Network**

  * VPC
  * Subnet
  * Internal IP
  * External IP

* **Location**

  * Region
  * Zone
  * Uptime (human‑readable)
  * Load average (5m)

All fields are fetched from the cloud metadata service (with fallbacks) and update live.

---

### System Resources

A detailed widget split into three sections:

* **CPU**

  * Current usage (percentage bar)
  * Number of cores and frequency (if available)
  * **Live CPU Trend** – mini line chart updated every 10 seconds, showing the last 20 readings

* **Memory**

  * Total, used, and free (in MB or GB)
  * Usage bar

* **Disk**

  * Total, used, and available (in MB or GB)
  * Usage bar

---

### Monitoring Endpoints

Quick access to the built‑in HTTP endpoints:

* **`/healthz`** – plain text health check (served by NGINX)
* **`/metadata`** – JSON with instance metadata + health object (uptime, load average, RAM, disk)
* **`/api/dashboard`** – live JSON data used by the frontend (not normally exposed to users, but listed for completeness)

Each endpoint is displayed as a clickable link (relative URL) that opens in a new tab.

---

### Featured Quote

* Random quote displayed in the Ambience section.
* **Bookmark quotes** – click the star icon to add a quote to your favourites list.
* **Favourites list** – view and manage your saved quotes (stored in browser `localStorage`).
* Quotes are refreshed every 10 seconds from the live API.

---

### International Photo Gallery

* Static images are scanned from the `/images` directory and displayed in a responsive grid.
* Image metadata is sourced from `images.json` and saved locally.

* Click the **info icon** on any image to see:

  * Image title
  * Location (city / country)

* **Save favourites** – mark images you like (stored locally).

* **Book flights** – the ✈️ button opens a new tab in Google Flights with a location pre‑filled (uses the image’s location metadata).

* **Living info** – the 🏠 button triggers a Google search for “What is it really like to live in [location]?”

---

### Services

* Displays the health status and performance of key system components:

  * **nginx** – running / stopped
  * **Python3** – installed / missing
  * **Metadata Service** – reachable / unreachable
  * **HTTP Service** – serving / not serving
  * **Startup Script** – completed / pending
  * **GitHub Quotes Sync** – successful / failed
  * **Bootstrap Packages** – list of installed packages

* **Cycle services** – use button or keyboard shortcut to show a custom number of services (3 → 30).

---

### Cycle Application Logs

* Displays the last **X** log entries (default 5, user‑configurable up to 30).

* Each log entry shows:

  * Time (HH:MM:SS)
  * Log level (info, warning, error)
  * Scope (system, metrics, quotes, nginx, security)
  * Message

* **Cycle logs** – adjust the number of displayed logs (5 → 30) via the button or keyboard shortcut.

---

### Text Mode

A minimalist, terminal‑style view of all the same information, optimized for keyboard navigation and quick copy‑paste.

#### How to Use

1. Click the **TEXT MODE** button in the top‑right corner.

2. The dashboard switches to a monospace layout showing:

   * Identity, Overview, Network, Location
   * Monitoring endpoints
   * Services
   * Application logs

3. Press `Esc` or click the `[Esc] EXIT` link to return to the graphical dashboard.

#### Keyboard Shortcuts

| Key   | Action                                          |
| ----- | ----------------------------------------------- |
| `Esc` | Exit text mode                                  |
| `C`   | Copy the entire dashboard snapshot to clipboard |
| `R`   | Refresh the displayed data                      |
| `H`   | Toggle help overlay                             |
| `L`   | Cycle the log limit (5 → 10 → 20 → 30)          |
| `S`   | Cycle the service limit (3 → 5 → 10 → 20 → 30)  |

> [!TIP]
> All preferences (service limit, log limit, favourite quotes, favourite images) are saved in your browser’s `localStorage`. This data persists across modes and sessions.

---

## Endpoints (Quick Reference)

| Endpoint         | Method | Description                                                                                        |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `/healthz`       | GET    | Returns `ok\n` (HTTP 200) – confirms NGINX is running.                                             |
| `/metadata`      | GET    | JSON with VM identity, network details, and a `health` object.                                     |
| `/api/dashboard` | GET    | Live dashboard data (CPU%, memory%, disk%, cost, quotes, logs, etc.) – used by the React frontend. |

---

### Example `/metadata` response (GCP)

```json
{
  "student_name": "Kirk Alton",
  "project_id": "kirk-devsecops-sandbox",
  "instance_id": "1234567890123456789",
  "instance_name": "devsecops-dashboard",
  "hostname": "devsecops-dashboard.us-central1-a.c...",
  "machine_type": "e2-medium",
  "network": {
    "vpc": "main",
    "subnet": "private-subnet",
    "internal_ip": "10.0.0.9",
    "external_ip": "34.59.220.4"
  },
  "region": "us-central1",
  "zone": "us-central1-a",
  "startup_utc": "2025-04-17T19:21:15Z",
  "uptime": "up 2 hours, 3 minutes",
  "health": {
    "uptime": "up 2 hours, 3 minutes",
    "load_avg": "0.12 0.34 0.56",
    "ram_mb": { "used": 512, "free": 3400, "total": 3912 },
    "disk_root": { "size": "20G", "used": "2.3G", "avail": "17G", "use_pct": "12%" }
  }
}
```

---

## Known Limitation — Clipboard (HTTP vs HTTPS)

The copy feature **will not work over plain HTTP**.

* `navigator.clipboard.writeText()` is **blocked by the browser** unless the page is served from:

  * `https://`
  * `http://localhost`

If your dashboard is accessed at:

```text
http://<public-ip>
```

then:

* `navigator.clipboard` may be `undefined`, or
* the write operation will silently fail or throw an error

> [!IMPORTANT]
> This is **not a bug in the dashboard**.
> It is a **browser‑enforced security restriction** and cannot be bypassed with modern APIs.

### Impact

* Text Mode → **Copy (`C`) is unreliable or non‑functional on HTTP**
* The rest of the dashboard works normally
* This is a **transport‑layer constraint (HTTP vs HTTPS)**, not an application issue

### Required Fix

To guarantee copy functionality:

* Serve the dashboard over **HTTPS**

Example (NGINX + Certbot):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Current Workaround

Fallback to legacy method:

```javascript
document.execCommand('copy')
```

* Works on HTTP
* Requires user interaction (keyboard or click)
* Deprecated, but still supported across major browsers

> [!NOTE]
> This provides partial functionality and should not be considered a long‑term solution.

---

## GCP – Required IAM Roles for Metadata & Billing

> [!IMPORTANT]
> For the `/metadata` endpoint to return the correct **subnet name**, the VM’s default Compute Engine service account must have the `roles/compute.viewer` role.
> For the **Optimize button** (Cost card) to appear, the same service account also needs `roles/billing.viewer`.

Grant both roles from your **local machine** (not inside the VM):

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
DEFAULT_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${DEFAULT_SA}" \
  --role="roles/compute.viewer"

# Grant billing.viewer on the *billing account*, not the project
BILLING_ACCOUNT_ID=$(gcloud billing projects describe YOUR_PROJECT_ID --format="value(billingAccountName)" | cut -d/ -f2)
gcloud beta billing accounts add-iam-policy-binding $BILLING_ACCOUNT_ID \
  --member="serviceAccount:${DEFAULT_SA}" \
  --role="roles/billing.viewer"
```

If you use a custom service account, replace the email accordingly.

> [!NOTE]
> The API inside the VM uses the standard `gcloud billing` command (no `beta`). The `beta` component is only needed on your local machine for modifying billing account IAM.

### Verify the roles

```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:serviceAccount:${DEFAULT_SA}"

gcloud beta billing accounts get-iam-policy $BILLING_ACCOUNT_ID \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:serviceAccount:${DEFAULT_SA}"
```

---

## Quick Start

> [!IMPORTANT]
> Deployment is fully automated using a startup script (user‑data / startup script).

1. **Copy the appropriate bootstrap script** into your VM’s user‑data / startup script field.

   * Use `infra/startup/startup.sh` as the **wrapper** – it installs dependencies, clones the repo, and then runs the main bootstrap.

2. **Launch a VM** (Ubuntu 20.04 / 22.04 recommended).

3. **Wait 5–10 minutes** while the scripts:

   * Install basic tools (nginx, Python, Node.js, git, **Google Cloud SDK**)
   * Clone the repository to `/opt/deploy`
   * Create a systemd service for the Flask API (`dashboard-api.service`) on port 8080
   * Build the React frontend
   * Configure NGINX to serve the dashboard and proxy `/api/` to Flask
   * Set up cron jobs for quotes (every 10 min), pricing (monthly), and auto‑deploy (every 15 min)
   * Start everything

4. **Open the VM’s public IP** in your browser – the dashboard appears.

> [!TIP]
> Logs are written to `/var/log/bootstrap.log` and `/var/log/startup-script.log` for troubleshooting.

> [!IMPORTANT]
> The dashboard may take up to 10 minutes to fully populate cost estimates, images, and quotes (cron jobs run every few minutes).

---

## Dashboard Customisation (Bootstrap Script)

> See: **`docs/CONFIGURATION.md`** *(placeholder – full customisation guide)*

**Quick variables** (edit at the top of `app_bootstrap.sh`):

```bash
DASHBOARD_APP_NAME="GCP Deployment"
DASHBOARD_TAGLINE="Infrastructure health and activity"
DASHBOARD_USER="Kirk Alton"
DASHBOARD_NAME="DevSecOps Dashboard"
VITE_GITHUB_URL="https://github.com/KirkAlton-Class7"
VITE_LINKEDIN_URL="https://www.linkedin.com/in/kirkcochranjr/"

> [!NOTE]

DO NOT EDIT UNLESS YOU KNOW WHAT YOU ARE DOING

GITHUB_QUOTES_URL="https://raw.githubusercontent.com/your-fork/main/quotes.json"
```

> [!NOTE]
> After editing, push to your repository; the auto‑deploy cron will rebuild the dashboard within 15 minutes.

---

## Dashboard API Configuration

> See: **`docs/API_CONFIGURATION.md`** *(placeholder – full API guide)*

**User‑configurable variable** (`dashboard_api.py`):

```python
student_name = "Kirk Alton"   # appears in /metadata
```

**Important notes**:

- The API caches static values (subnet name, billing account ID) – first request may be slower, subsequent requests are fast (<0.2s).
- `get_ssh_status()` is cached for 60 seconds; `get_update_status()` for 5 minutes.
- Cost data is written to `/var/tmp/vm-cost.json` (persists across reboots).
- Quotes are read from `/var/www/vm-dashboard/data/quotes.json` (updated by cron).

After modifying the API, restart the service:

```bash
sudo systemctl restart dashboard-api
```

---

## Local Development

### Clone the repository

```bash
git clone https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git
cd devsecops-vm-dashboard/dashboard
```

### Run the React frontend

```bash
npm install
npm run dev
```

Access: `http://localhost:5173`

### Run the Flask API locally

```bash
cd ..
python3 dashboard_api.py
```

The API will listen on `http://localhost:8080`.

---

## Repository Structure

```
devsecops-vm-dashboard/
├── dashboard/               # React frontend (Vite + Tailwind)
├── images/                  # Gallery images
├── images.json              # Image metadata (auto‑generated)
├── quotes.json              # Featured quotes
├── scripts/
│   ├── bootstrap/
│   │   └── app_bootstrap.sh # Main dashboard deployment script
│   ├── monitoring_server.py # Flask API (renamed to dashboard_api.py)
│   └── fetch_pricing.py     # Pricing cache generator
├── dashboard_api.py         # Flask API (metadata + live dashboard data)
└── README.md
```

---

## Cloud Provider Support

| Provider     | Metadata           | Metrics               | Auto‑deploy  | Subnet (full)                |
| ------------ | ------------------ | --------------------- | ------------ | ---------------------------- |
| **GCP**      | Metadata server    | `/proc`, `free`, `df` | cron         | Requires `compute.viewer`    |
| **Azure**    | 169.254.169.254    | same                  | cron         | Inconsistent                 |
| **AWS**      | 169.254.169.254    | same                  | cron         | Unstable (under development) |
| **Local VM** | fallback detection | same                  | if available | N/A                          |

> [!NOTE]
> No cloud‑specific code is required; the dashboard automatically adapts to the available metadata.

---

## Troubleshooting Quick Commands

| Check | Command |
|-------|---------|
| API service status | `sudo systemctl status dashboard-api` |
| API response | `curl -s http://localhost:8080/api/dashboard | head -c 200` |
| Nginx status | `sudo systemctl status nginx` |
| Frontend through nginx | `curl -s http://localhost/ | grep -o "<title>"` |
| Bootstrap logs | `sudo tail -100 /var/log/bootstrap.log` |
| Startup script logs | `sudo tail -100 /var/log/startup-script.log` |
| API logs | `sudo journalctl -u dashboard-api -n 50` |
| Billing account ID test | `curl -s http://localhost:8080/api/dashboard | jq '.identity.billingAccountId'` |

---

## Known Limitations

- **Cost estimation** is heuristic (static price × uptime). It is **not** a real billing API call.
- **External IP fallback** uses `ifconfig.me`; if the VM has no internet, external IP will show `unknown`.
- **Azure / AWS** support is partial; the dashboard is primarily tested on GCP.
- **Clipboard** requires HTTPS (see the dedicated section above).

---

## Roadmap & Upcoming Features

### Security

- [ ] Enable HTTPS via Let's Encrypt + NGINX
- [ ] Add optional self‑signed certificate mode for lab deployments
- [ ] Expose `secureContext` flag in `/api/dashboard`

### Clipboard & UX Enhancements

- [ ] Improve fallback handling for HTTP environments
- [ ] Add “Copy Snapshot” button (mouse users)
- [ ] Add “View Snapshot” modal (manual copy option)
- [ ] Add toast: *“Copy requires HTTPS — fallback used”*
- [ ] Add visual indicator when running in degraded (HTTP) mode

### Export Features

- [ ] Download snapshot as `.txt`
- [ ] Download snapshot as `.json`
- [ ] Add `/api/snapshot` endpoint for remote retrieval

### Future Improvements (Planned)

- Add persistent storage for historical metrics.
- Integrate real cloud billing APIs (AWS Cost Explorer, Azure Consumption).
- Make the dashboard fully cloud‑agnostic with provider adapters.

---

## License

MIT license – free to use, modify, and distribute.