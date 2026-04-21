# VM Dashboard (DevSecOps + FinOps)

A real‑time infrastructure and cost monitoring dashboard that deploys automatically on **GCP** (primary), with partial support for AWS and Azure.  

It provides live system data and metrics, for DevSecops, and includes a mode with **FinOps insights** (cost trends, budgets, rightsizing, idle resources). Both dashboard modes include a particle screensaver, an international photo gallery, inspirational quotes, and a terminal‑style text mode, all without external monitoring services.

---

## Features Menu

### Overview (DevSecOps Mode)

* Four interactive summary cards:
  * **CPU Usage** – current percentage with color‑coded health status
  * **Memory Usage** – real‑time memory consumption
  * **Disk Usage** – root partition utilisation
  * **Estimated Cost** – heuristic, cloud‑specific running cost (approximate)

* Each card updates every 10 seconds via the live API.

* **Cards are clickable**:
  * **CPU / Memory / Disk** → GCP Compute Engine instance details page
  * **Estimated Cost** → GCP Billing overview for the project
  * **Optimize button** (appears on the Cost card when a billing account ID is available) → opens the FinOps Hub for cost optimisation.

### FinOps Dashboard (New!)

Switch to **FinOps mode** via the mode toggle in the header. This unlocks:

* **Daily Cost Trend** – last 10 days of actual cloud spend (from BigQuery billing export)
* **Top Services by Cost** – breakdown of your biggest spend categories
* **Budgets** – view your defined budgets with spent/forecast and threshold alerts
* **CPU Utilization** – P95 CPU usage per VM (last hour) with rightsizing candidates
* **Rightsizing Opportunities** – machine type recommendations with estimated monthly savings
* **Idle Resources** – VMs and other assets with low usage
* **Savings Summary** – realised and potential savings from recommendations

All FinOps data is fetched from **real GCP APIs** (BigQuery, Cloud Monitoring, Recommender, Budgets).  
*See the prerequisites section below for required IAM roles and API setup.*

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

A minimalist, terminal‑style view of all the same information, optimised for keyboard navigation and quick copy‑paste.

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

### Monitoring Endpoints

Quick access to the built‑in HTTP endpoints:

* **`/healthz`** – plain text health check (served by NGINX)
* **`/metadata`** – JSON with instance metadata + health object (uptime, load average, RAM, disk)
* **`/api/dashboard`** – live JSON data used by the DevSecOps frontend
* **`/api/finops`** – live FinOps data (cost trends, budgets, utilisation, recommendations)

Each endpoint is displayed as a clickable link (relative URL) that opens in a new tab.

---

## Endpoints (Quick Reference)

| Endpoint         | Method | Description                                                                                        |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `/healthz`       | GET    | Returns `ok\n` (HTTP 200) – confirms NGINX is running.                                             |
| `/metadata`      | GET    | JSON with VM identity, network details, and a `health` object.                                     |
| `/api/dashboard` | GET    | Live DevSecOps dashboard data (CPU%, memory%, disk%, cost, quotes, logs, etc.).                    |
| `/api/finops`    | GET    | Live FinOps data (cost trends, top services, budgets, CPU utilisation, recommendations, savings).  |

---

### Example `/metadata` response (GCP)

```json
{
  "STUDENT_NAME": "Kirk Alton",
  "project_id": "kirk-devsecops-sandbox",
  "instance_id": "1234567890123456789",
  "instance_name": "vm-dashboard",
  "hostname": "vm-dashboard.us-central1-a.c...",
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

If your dashboard is accessed at `http://<public-ip>`, then:
* `navigator.clipboard` may be `undefined`, or
* the write operation will silently fail or throw an error

> [!IMPORTANT]
> This is **not a bug in the dashboard**. It is a **browser‑enforced security restriction**.

### Impact

* Text Mode → **Copy (`C`) is unreliable or non‑functional on HTTP**
* The rest of the dashboard works normally

### Required Fix

Serve the dashboard over **HTTPS** (e.g., NGINX + Certbot).

### Current Workaround

The dashboard includes a fallback to `document.execCommand('copy')`. This works on HTTP but is deprecated and requires user interaction.



---

## Roadmap & Upcoming Features

### Security

- [ ] Enable HTTPS via Let's Encrypt + NGINX
- [ ] Add optional self‑signed certificate mode for lab deployments

### FinOps Enhancements

- [ ] Add CUD (committed use discount) coverage widget
- [ ] Add “Forecast vs Budget” sparklines
- [ ] Integrate Cloud Asset Inventory for idle resource detection

### Clipboard & UX Enhancements

- [ ] Improve fallback handling for HTTP environments
- [ ] Add “Copy Snapshot” button (mouse users)
- [ ] Add “View Snapshot” modal (manual copy option)
- [ ] Add toast: *“Copy requires HTTPS — fallback used”*

### Export Features

- [ ] Download snapshot as `.txt`
- [ ] Download snapshot as `.json`
- [ ] Add `/api/snapshot` endpoint for remote retrieval

### Future Improvements

- Add persistent storage for historical metrics.
- Make the dashboard fully cloud‑agnostic with provider adapters.

---

## License

MIT license – free to use, modify, and distribute.