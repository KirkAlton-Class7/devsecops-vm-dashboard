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

Displays health and status of key system components returned by `build_dashboard_data()`:

* **nginx** – running / stopped

* **Python** – installed

* **Metadata Service** – reachable

* **HTTP Service** – serving

* **Startup Script** – completed

* **GitHub Quotes Sync** – successful

* **Bootstrap Packages** – installed packages list

* **Default view** – shows 10 services by default and displays `Showing X of X services`

* **View all services** – opens the full service list in a modal

* **Sort services** – cycles through Name A-Z, Name Z-A, Status Healthy-Critical, and Status Critical-Healthy

* **Filter services** – filters by service name and status

---

### Application Logs

* Displays the last **30** log entries from `journalctl`

Each entry includes:

* Time (`YYYY-MM-DD HH:MM:SS`)

* Level (info / warning / error)

* Scope/source (from `SYSLOG_IDENTIFIER`, truncated for display)

* Message

* **View all logs** – opens a modal backed by `/api/logs`

* **Show older logs** – appends paginated logs using the same timestamp format, including year

* **Refresh logs** – reloads the currently selected time window

* **Sort logs** – cycles through Time Newest, Time Oldest, Level Error-Debug, Level Debug-Error, Source A-Z, and Source Z-A

* **Filter logs** – filters the currently loaded logs by level and source

* **Search logs** – searches loaded modal rows by time, level, source, or message

> Filters are client-side and apply to the logs currently loaded in the modal. They persist while paging older logs and reset on full refresh.
> When a filter modal is opened from another modal, closing it restores focus to the previous modal layer.

---

## Text Mode

A minimalist, terminal-style view of DevSecOps data. Optimized for keyboard navigation and copy-paste workflows.

To enable, press `T` or click **TEXT MODE** (top-right).

Displays:

* Identity, Overview, Network, Location
* Monitoring endpoints
* Services with the same 10-row default, sort, filter, and view-all behavior as DevSecOps mode
* Application logs with Time, Level, Source, and Message columns

Exit with `Esc` or `[Esc] EXIT`.

---

### Keyboard Shortcuts

| Key   | Action                                     |
| ----- | ------------------------------------------ |
| `Esc` | Exit text mode                             |
| `C`   | Copy dashboard snapshot                    |
| `H`   | Toggle help overlay                        |
| `L`   | Sort logs                                  |
| `FL`  | Filter logs                                |
| `LL`  | View all logs                              |
| `S`   | Sort services                              |
| `FS`  | Filter services                            |
| `SS`  | View all services                          |

Text mode filter popups use the same filter options as the graphical dashboard:

* Arrow keys move through filter columns
* `Space` or `Enter` toggles a filter
* `Delete` or `Backspace` clears filters
* `Esc` closes the active popup and returns focus to the previous modal layer

When `ALL SYSTEM LOGS` is open, press `R` to refresh the loaded log window.

> [!TIP]
> Favorite quotes are saved in `localStorage` and persist across sessions.

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

* **FinOps summary cards are clickable:**

  * **Total Cost / Forecast** → GCP Billing overview
  * **Potential Savings** → FinOps Hub
  * **CUD Coverage** → Compute Engine commitments

* **Daily Cost Trend** – last 10 days

* **Top Services by Cost** – spend breakdown

* **Budgets** – configured budgets with placeholder spent/forecast values

* **CPU Utilization** – P95 per VM (last hour), 10-row preview with sort/view-all modal

* **Rightsizing Recommendations** – machine recommendations, 10-row preview with sort/view-all modal

* **Idle Resources** – underutilized assets, 10-row preview with sort/view-all modal

* **Filtering and search** – FinOps list widgets use modal-based filters and modal search. CPU filters include rightsizing candidate and utilization range. Idle resource filters include scope, status, and resource type. Rightsizing filters include level and savings.

* **Savings Summary** – realized savings (`0.0`) + potential rightsizing savings

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

## Ambiance (Shared Feature)

### Featured Quote

* Random quote loaded from `/data/quotes.json`
* Manual refresh button selects a new quote
* ⭐ Bookmark quotes → saved locally
* View/manage favorites via `localStorage`

---

### Screensaver

Interactive particle background (click to cycle):

* **Drift** – cyan particles + connecting lines
* **Haze** – purple particles forming patterns
* **State** – white particles with periodic repositioning

---

### International Photo Gallery

* Images loaded from `/data/images` + `/data/images.json`
* Responsive grid layout

Features:

* ℹ️ View image metadata (title + location)
* ⭐ Save favorites (local)
* ✈️ Open Google Travel Explore for liked destinations
* 🏠 “Living info” Google search

---

## Monitoring Endpoints

Quick reference for built-in endpoints:

* `/healthz` – plain text health check
* `/metadata` – VM metadata + health JSON
* `/api/dashboard` – DevSecOps data
* `/api/finops` – FinOps data
* `/api/config` – API config JSON
* `/api/logs` – paginated journal logs

The frontend Monitoring Endpoints card currently links to `/healthz` and `/metadata`.

---

## Endpoints (Quick Reference)

| Endpoint         | Method | Description                |
| ---------------- | ------ | -------------------------- |
| `/healthz`       | GET    | Returns `ok` (NGINX check) |
| `/metadata`      | GET    | VM + health JSON           |
| `/api/dashboard` | GET    | DevSecOps data             |
| `/api/finops`    | GET    | FinOps data                |
| `/api/config`    | GET    | API config JSON            |
| `/api/logs`      | GET    | Paginated journal logs     |

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
