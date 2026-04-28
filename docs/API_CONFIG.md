# Dashboard API Configuration

The API server (`scripts/dashboard_api.py`) provides live data for the dashboard via:

* `/api/dashboard` – full dashboard payload (used by the frontend)
* `/api/finops` – cost, budget, utilization, and recommendation payload
* `/api/config` – static API settings
* `/api/logs` – paginated `journalctl` logs with optional time-window filtering
* `/metadata` – instance metadata + health object
* `/healthz` – basic service health check

It runs as a **systemd service** on the VM (fixed port `8080`).

---

## User-Configurable Variable

At the top of the file, you will find:

```python
# -------------------------------
# API Customization
# -------------------------------
STUDENT_NAME = "Kirk Alton"

# Your billing account ID (hardcoded for reliability)
BILLING_ACCOUNT_ID = "01BB2F-8195CD-645BC0"
```

* **`STUDENT_NAME`** – Appears in the `/metadata` response under the `STUDENT_NAME` field.
* **`BILLING_ACCOUNT_ID`** – Used by `get_budgets()` when calling `gcloud billing budgets list`.

> [!NOTE]
> `STUDENT_NAME` is only used for display in the metadata endpoint.
> It does **not** affect dashboard functionality or system behavior.

---

## Metadata Override Behavior (Important)

Your API includes a runtime override:

```python
student_name = get_metadata("instance/attributes/STUDENT_NAME")
if student_name in ("unknown", ""):
    student_name = STUDENT_NAME
```

> [!IMPORTANT]
> If a **GCP instance metadata attribute** named `STUDENT_NAME` exists, it will override the hardcoded value in `dashboard_api.py`.

### Practical Implication

```text
GCP Metadata Attribute: STUDENT_NAME (if present)
        ↓
Overrides
        ↓
STUDENT_NAME in Python
```

> [!TIP]
> This allows you to set `STUDENT_NAME` **without modifying code**, using instance metadata instead.

---

## Configuration Boundary

```python
# ---------------------------------------------------------------------------------------------
# !!! END OF CONFIGURATION - DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING !!!
# ---------------------------------------------------------------------------------------------
```

> [!IMPORTANT]
> Treat this as a **hard boundary**:
>
> * Above → safe for basic customization
> * Below → core application logic (API, metrics, system calls)

---

# Dashboard Output Customization – API Fields & Metadata

This section outlines how the values returned by the API are structured and where they originate. It is intended for users who want to adjust what appears in the dashboard or metadata endpoints.

---

## Output Structure Overview

The API exposes three main data outputs:

* **`/api/dashboard`** – main dataset used by the frontend UI
* **`/api/finops`** – FinOps dataset used by the FinOps UI
* **`/metadata`** – structured instance and health information

These outputs are constructed in two locations:

```text
build_dashboard_data()        → /api/dashboard
get_cached_finops_data()      → /api/finops
MonitoringHandler (/metadata) → /metadata
```

> [!NOTE]
> Any changes to displayed values are derived from these two sections of the codebase.

---

## Dashboard Data (`/api/dashboard`)

The dashboard UI is driven by a single structured object returned by `build_dashboard_data()`.

### Key Sections

```text
summaryCards
vmInformation
services
security
meta
logs
resourceTable
identity
network
location
systemResources
```

Each section represents a logical grouping of data displayed in the UI.

The dashboard preview uses the `logs` array returned by `/api/dashboard`. The full log modals load from `/api/logs` so they can paginate beyond the preview.

---

### Field Composition

Most display elements follow a consistent structure:

```json
{
  "label": "CPU",
  "value": "25%",
  "status": "healthy"
}
```

> [!TIP]
> Maintaining this structure ensures compatibility with the frontend rendering logic.

---

### Data Sources

Values in the dashboard are derived from:

* System files (`/proc`, `df`, `uptime`)
* Cloud metadata (`get_metadata`)
* Helper functions (`get_*`)
* Environment variables (`os.environ`)
* Local files (e.g., `quotes.json`, cost cache)
* GCP APIs for FinOps data (BigQuery, Monitoring, Recommender, Budgets)

> [!NOTE]
> DevSecOps values are computed locally or via metadata. FinOps values use GCP APIs when the required IAM and billing export are configured.

---

## Logs API (`/api/logs`)

The logs endpoint is built from `journalctl` JSON output:

```python
cmd = [journalctl_path, "--since", f"{minutes} minutes ago", "--no-pager", "-o", "json"]
```

When `minutes` is not provided, the endpoint reads the latest `ALL_LOGS_MAX_LINES` entries for general browsing:

```python
cmd = [journalctl_path, "-n", str(ALL_LOGS_MAX_LINES), "--no-pager", "-o", "json"]
```

It returns a paginated response:

```json
{
  "logs": [],
  "offset": 200,
  "hasMore": true,
  "total": 1432
}
```

Supported query parameters:

| Parameter | Purpose | Default |
| --------- | ------- | ------- |
| `limit` | Number of log rows to return | `100` |
| `offset` | Pagination offset for older logs | `0` |
| `minutes` | Optional time window in minutes | unset |

Each log row includes:

```json
{
  "time": "2026-04-27 14:58:42",
  "level": "WARN",
  "source": "nginx",
  "message": "..."
}
```

`time` is formatted as `YYYY-MM-DD HH:MM:SS`. When `minutes` is set, the API queries journalctl with `--since` for that time window, then paginates the result. The frontend applies sort, search, and filters client-side to the currently loaded rows. Full refreshes reload the selected time window and reset active log filters.

---

## Metadata Endpoint (`/metadata`)

The `/metadata` endpoint returns a structured JSON object describing:

* Instance identity
* Network configuration
* Location (region/zone)
* System health (uptime, load, memory, disk)

---

### Metadata Structure

```JSON
"STUDENT_NAME": student_name,
"project_id": project_id,
"instance_id": instance_id,
"instance_name": instance_name,
"hostname": hostname,
"machine_type": machine_type,

"network": {
    "vpc": vpc,
    "subnet": subnet,
    "internal_ip": internal_ip,
    "external_ip": external_ip,
},

"region": region,
"zone": zone,
"startup_utc": startup_utc,
"uptime": uptime,
                    
"health": {
    "uptime": uptime,
    "load_avg": load_avg_str,
    "ram_mb": ram_mb,
    "disk_root": disk_root
}
```

These values are derived from system-level helper functions and formatted for readability.

---

## Environment Variable Integration (Cross-Component)

The API reads dashboard branding values from environment variables:

```python
"meta": {
    "appName": os.environ.get("DASHBOARD_APP_NAME", "GCP Deployment"),
    "tagline": os.environ.get("DASHBOARD_TAGLINE", "Infrastructure health and activity"),
    "dashboardUser": os.environ.get("DASHBOARD_USER", "Kirk Alton"),
    "dashboardName": os.environ.get("DASHBOARD_NAME", "DevSecOps Dashboard"),
}
```

> [!IMPORTANT]
> These values are **not defined in this file**.
> They are exported by `app_bootstrap.sh` before the API service is started.

### Data Flow

```text
app_bootstrap.sh
    ↓ (exports ENV vars)
Linux environment
    ↓
dashboard_api.py (os.environ)
    ↓
/api/dashboard
    ↓
React frontend
```

> [!TIP]
> If branding values are incorrect in the UI, check:
>
> * Environment variables
> * systemd service restart
> * bootstrap script execution

---

## Required IAM Role (GCP)

> [!IMPORTANT]
> For the `/metadata` endpoint to return the correct **subnet name**, the VM’s service account must have:

```
roles/compute.viewer
```

### Why This Is Required

* The metadata server may return incomplete network data
* The API falls back to:

```bash
gcloud compute instances describe ...
```

* This requires IAM read permissions

---

### Grant the Role (from local machine)

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
DEFAULT_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${DEFAULT_SA}" \
  --role="roles/compute.viewer"
```

---

### Verify the Role

```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:serviceAccount:${DEFAULT_SA}"
```

> [!NOTE]
> Without this role, the subnet field will return `unknown`.

---

## Runtime Data & File Locations

The API relies on local system files and generated data:

* **Cost tracking**

  * File: `/var/tmp/vm-cost.json`
  * Persists across reboots
  * Used only by the DevSecOps **Estimated Cost** card

* **Quotes data**

  * File: `/var/www/vm-dashboard/data/quotes.json`
  * Updated via cron (every ~10 minutes)

* **BigQuery billing export**

  * Dataset: `billing_export`
  * Table pattern: `gcp_billing_export_v1_*`
  * Used by `get_cost_trend()` and `get_top_services_by_cost()`

> [!NOTE]
> If quotes stop updating, verify:
>
> * Cron job status
> * `GITHUB_QUOTES_URL` accessibility
> * File permissions

---

## Caching Behavior

The API uses lightweight TTL caching:

```python
@ttl_cache(seconds=10)
def build_dashboard_data()

@ttl_cache(seconds=60)
def get_ssh_status()

@ttl_cache(seconds=300)
def get_update_status()

@ttl_cache(seconds=3600)
def get_cost_trend(days=30)
```

* Reduces repeated system calls (`systemctl`, `apt`)
* Improves API responsiveness
* Keeps FinOps API calls from querying BigQuery and GCP APIs on every request

> [!TIP]
> Cached values may appear slightly stale (10 seconds for DevSecOps, 5 minutes for update/CPU checks, and up to 1 hour for cost, budget, and recommendation data).

---

## System Data Sources

All system metrics are collected directly from the VM:

* `/proc` → CPU, memory, load
* `df` → disk usage
* `uptime` → system uptime
* `systemctl` → service health
* metadata server → instance details
* `journalctl` → `/api/logs` and dashboard log rows

> [!NOTE]
> Cloud Monitoring is used only for FinOps CPU utilization across VMs.

---

## Applying Changes

If you modify `scripts/dashboard_api.py` (e.g., update `STUDENT_NAME`, `BILLING_ACCOUNT_ID`, or logic), restart the service:

```bash
sudo systemctl restart dashboard-api.service
```

> [!IMPORTANT]
> Changes will not take effect until the service is restarted.

---

## Common Pitfalls

> [!CAUTION]
> Changes made but not visible? Check the following:

* Service not restarted
* Environment variables not updated
* Metadata override still active
* IAM role missing (subnet = `unknown`)

---
