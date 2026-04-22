# Features and Roadmap


## DevSecOps Mode

**DevSecOps Mode (default view)** – A real-time, graphical dashboard of infrastructure health. Optimized for live system metrics and quick access to VM information.
To enable, press `D` or click the **DevSecOps** button in the mode dropdown menu.

---

### Summary Cards

* Four interactive summary cards:

  * **CPU Usage** – current percentage with color-coded health status
  * **Memory Usage** – real-time memory consumption
  * **Disk Usage** – root partition utilization
  * **Estimated Cost** – heuristic, cloud-specific running cost (approximate)

* Each card updates every **10 seconds** via the live API.

* **Cards are clickable:**

  * **CPU / Memory / Disk** → GCP Compute Engine instance details page
  * **Estimated Cost** → GCP Billing overview
  * **Optimize button** *(appears when billing account ID is available)* → opens FinOps Hub for cost optimization

---

### Load

* **System Load (1m)** – current load average

* **Trend Chart** – bar graph of the last 10 samples (10s interval)

* **Detailed insights:**

  * Peak load (last 10 readings)
  * Average load
  * Color-coded status: Normal / Elevated / High / Critical

* Chart auto-rescales to peak load (capped at 5.0)

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
  * Uptime (human-readable)
  * Load average (5m)

> All fields are fetched from the cloud metadata service (with fallbacks) and update live.

---

### System Resources

A detailed widget with three sections:

* **CPU**

  * Current usage (percentage bar)
  * Core count + frequency (if available)
  * **Live CPU Trend** – mini line chart (last 20 readings, 10s interval)

* **Memory**

  * Total / Used / Free (MB or GB)
  * Usage bar

* **Disk**

  * Total / Used / Available (MB or GB)
  * Usage bar

---

### Services

Displays health and status of key system components:

* **nginx** – running / stopped

* **Python3** – installed / missing

* **Metadata Service** – reachable / unreachable

* **HTTP Service** – serving / not serving

* **Startup Script** – completed / pending

* **GitHub Quotes Sync** – successful / failed

* **Bootstrap Packages** – installed packages list

* **Cycle services** – adjust visible services (3 → 30) via button or shortcut

---

### Application Logs

* Displays last **X** log entries (default: 5, configurable up to 30)

Each entry includes:

* Time (HH:MM:SS)

* Level (info / warning / error)

* Scope (system, metrics, quotes, nginx, security)

* Message

* **Cycle logs** – adjust log count (5 → 30)

---

## Text Mode

A minimalist, terminal-style view of DevSecOps data. Optimized for keyboard navigation and copy-paste workflows.

To enable, press `T` or click **TEXT MODE** (top-right).

Displays:

* Identity, Overview, Network, Location
* Monitoring endpoints
* Services
* Application logs

Exit with `Esc` or `[Esc] EXIT`.

---

### Keyboard Shortcuts

| Key   | Action                                     |
| ----- | ------------------------------------------ |
| `Esc` | Exit text mode                             |
| `C`   | Copy dashboard snapshot                    |
| `R`   | Refresh data                               |
| `H`   | Toggle help overlay                        |
| `L`   | Cycle log limit (5 → 10 → 20 → 30)         |
| `S`   | Cycle service limit (3 → 5 → 10 → 20 → 30) |

> [!TIP]
> Preferences (service limit, logs, favourites) are saved in `localStorage` and persist across sessions.

---

## FinOps Mode

**FinOps Mode** – A cost-optimization dashboard for cloud spend, budgets, and usage.
To enable, press `F` or click the **FinOps** button.

---

### Core Widgets

* **Total Cost (MTD)** – month-to-date spend (BigQuery)

* **Forecast (EOM)** – projected end-of-month cost

* **Potential Savings** – estimated savings from rightsizing

* **CUD Coverage** – placeholder (coming soon)

* **Daily Cost Trend** – last 10 days

* **Top Services by Cost** – spend breakdown

* **Budgets** – thresholds + alerts

* **CPU Utilization** – P95 per VM (last hour)

* **Rightsizing Opportunities** – machine recommendations

* **Idle Resources** – underutilized assets

* **Savings Summary** – realized + potential savings

> **Note:** Data is sourced from GCP APIs (BigQuery, Monitoring, Recommender, Budgets).
> Initial data population may be delayed (see below).

---

### FinOps Data Population Latency

| Feature           | Latency        | Notes                                            |
| ----------------- | -------------- | ------------------------------------------------ |
| CPU utilization   | 5–10 minutes   | Monitoring API (1-min collection, 5-min queries) |
| Cost trends       | ~24 hours      | BigQuery billing export (daily)                  |
| Top services      | ~24 hours      | Same as cost trends                              |
| Budgets           | Near real-time | API-based                                        |
| Rightsizing       | 24–48 hours    | Requires usage history                           |
| Idle resources    | 24–48 hours    | Same as above                                    |
| Realized savings  | N/A            | Not implemented                                  |
| Potential savings | 24–48 hours    | Derived from recommendations                     |

> First-time billing export may take **up to 24 hours**.

---

## Ambience (Shared Feature)

### Featured Quote

* Random quote (refreshes every 10s)
* ⭐ Bookmark quotes → saved locally
* View/manage favourites via `localStorage`

---

### Screensaver

Interactive particle background (click to cycle):

* **Drift** – cyan particles + connecting lines
* **Haze** – purple particles forming patterns
* **State** – white particles with periodic repositioning

---

### International Photo Gallery

* Images loaded from `/images` + `images.json`
* Responsive grid layout

Features:

* ℹ️ View image metadata (title + location)
* ⭐ Save favourites (local)
* ✈️ Open Google Flights (pre-filled location)
* 🏠 “Living info” Google search

---

## Monitoring Endpoints

Quick access to built-in endpoints:

* `/healthz` – plain text health check
* `/metadata` – VM metadata + health JSON
* `/api/dashboard` – DevSecOps data
* `/api/finops` – FinOps data

All endpoints are clickable (open in new tab).

---

## Endpoints (Quick Reference)

| Endpoint         | Method | Description                |
| ---------------- | ------ | -------------------------- |
| `/healthz`       | GET    | Returns `ok` (NGINX check) |
| `/metadata`      | GET    | VM + health JSON           |
| `/api/dashboard` | GET    | DevSecOps data             |
| `/api/finops`    | GET    | FinOps data                |

---

### Example `/metadata` Response (GCP)

*(unchanged)*

---

## Known Limitation — Clipboard (HTTP vs HTTPS)

Clipboard API requires secure context.

**Works only on:**

* `https://`
* `http://localhost`

**Fails on:**

* `http://<public-ip>`

---

### Impact

* Text Mode → Copy (`C`) unreliable on HTTP
* Dashboard otherwise unaffected

---

### Fix

Serve via **HTTPS** (NGINX + Certbot)

---

### Workaround

Fallback to `document.execCommand('copy')` (deprecated, requires interaction)

---

## Roadmap & Upcoming Features

### Security

* [ ] Enable HTTPS (Let’s Encrypt + NGINX)
* [ ] Self-signed cert mode for labs

### FinOps

* [ ] CUD coverage widget
* [ ] Forecast vs Budget sparklines
* [ ] Cloud Asset Inventory integration

### Clipboard & UX

* [ ] Improve HTTP fallback
* [ ] Add “Copy Snapshot” button
* [ ] Add “View Snapshot” modal
* [ ] Add HTTPS warning toast

### Export

* [ ] `.txt` snapshot
* [ ] `.json` snapshot
* [ ] `/api/snapshot` endpoint

### Future

* Persistent historical metrics
* Cloud-agnostic provider adapters

---

## License

MIT License – free to use, modify, and distribute.

---
