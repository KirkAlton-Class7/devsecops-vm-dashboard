---

# Dashboard API – Configuration & Important Notes

The API server (`dashboard_api.py`) provides live data for the dashboard via:

* `/api/dashboard` – full dashboard payload (used by the frontend)
* `/metadata` – instance metadata + health object
* `/healthz` – basic service health check

It runs as a **systemd service** on the VM (default port `8080`).

---

## User-Configurable Variable

At the top of the file, you will find:

```python
# -------------------------------
# Metadata Customization
# -------------------------------
student_name = "Kirk Alton"
```

* **`student_name`** – This value appears in the `/metadata` response under the `student_name` field.

> [!NOTE]
> This value is only used for display in the metadata endpoint.
> It does **not** affect dashboard functionality or system behavior.

---

## Metadata Override Behavior (Important)

Your API includes a runtime override:

```python
meta_student = get_metadata("instance/attributes/student_name")
final_student = meta_student if meta_student != "unknown" and meta_student else student_name
```

> [!IMPORTANT]
> If a **GCP instance metadata attribute** named `student_name` exists, it will override the hardcoded value in `dashboard_api.py`.

### Practical Implication

```text
GCP Metadata Attribute (if present)
        ↓
Overrides
        ↓
student_name in Python
```

> [!TIP]
> This allows you to set `student_name` **without modifying code**, using instance metadata instead.

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

The API exposes two primary data outputs:

* **`/api/dashboard`** – main dataset used by the frontend UI
* **`/metadata`** – structured instance and health information

These outputs are constructed in two locations:

```text
build_dashboard_data()        → /api/dashboard
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

> [!NOTE]
> The API does not rely on external monitoring services; all values are computed locally or via metadata.

---

## Metadata Endpoint (`/metadata`)

The `/metadata` endpoint returns a structured JSON object describing:

* Instance identity
* Network configuration
* Location (region/zone)
* System health (uptime, load, memory, disk)

---

### Metadata Structure

```text
student_name
project_id
instance_id
instance_name
hostname
machine_type
network
region
zone
startup_utc
uptime
health
```

---

### Health Block

The `health` object includes:

```text
uptime
load_avg
ram_mb
disk_root
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
> They are injected by `app_bootstrap.sh` at runtime.

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

* **Quotes data**

  * File: `/var/www/vm-dashboard/data/quotes.json`
  * Updated via cron (every ~10 minutes)

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
@ttl_cache(seconds=60)
def get_ssh_status()

@ttl_cache(seconds=300)
def get_update_status()
```

* Reduces repeated system calls (`systemctl`, `apt`)
* Improves API responsiveness

> [!TIP]
> Cached values may appear slightly stale (up to 5 minutes for updates).

---

## System Data Sources

All system metrics are collected directly from the VM:

* `/proc` → CPU, memory, load
* `df` → disk usage
* `uptime` → system uptime
* `systemctl` → service health
* metadata server → instance details

> [!NOTE]
> No external monitoring services are used.

---

## Applying Changes

If you modify `dashboard_api.py` (e.g., update `student_name` or logic), restart the service:

```bash
sudo systemctl restart dashboard-api
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
