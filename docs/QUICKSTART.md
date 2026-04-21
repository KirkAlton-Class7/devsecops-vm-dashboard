# Quickstart

## Prerequisites & IAM Setup

> See [GCP Prerequisites Runbook](./PREREQUISITES.md)

**Quick summary:**

* **Enable APIs**: `bigquery`, `monitoring`, `recommender`, `billingbudgets`, `cloudbilling`, `cloudquotas`.
* **Create a custom service account** (recommended) or use the default Compute Engine SA.
* **Grant IAM roles**:
  * `roles/billing.viewer` on the **billing account**
  * `roles/bigquery.dataViewer`, `bigquery.jobUser`, `monitoring.viewer`, `recommender.computeViewer` on the **project**.
* **Set up BigQuery billing export** to a dataset named `billing_export`.
* **Ensure the VM is created with the `cloud-platform` OAuth scope**.

The FinOps dashboard will show real data only after these prerequisites are met and the BigQuery export has populated (up to 24 hours).

---

## Quick Start

> [!IMPORTANT]
> Deployment is fully automated using a startup script.

1. **Copy the appropriate bootstrap script** into your VM’s user‑data / startup script field.
   * Use `infra/startup/startup.sh` as the **wrapper** – it installs dependencies, clones the repo, and then runs the main bootstrap.

2. **Launch a VM** (Debian 11 or Ubuntu 20.04/22.04 recommended).

3. **Wait 5–10 minutes** while the scripts:
   * Install basic tools (nginx, Python, Node.js, git, **Google Cloud SDK**)
   * Clone the repository to `/opt/deploy`
   * Install Python packages (`google-cloud-bigquery`, `google-cloud-monitoring`, etc.)
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
> FinOps data may take up to 24 hours to appear after enabling BigQuery billing export.

---

## Dashboard Customization (Bootstrap Script)

See **`docs/CONFIGURATION.md`** *(placeholder – full customisation guide)*

**Quick variables** (edit at the top of `app_bootstrap.sh`):

```bash
DASHBOARD_APP_NAME="GCP Deployment"
DASHBOARD_TAGLINE="Infrastructure health and activity"
DASHBOARD_USER="Kirk Alton"
DASHBOARD_NAME="DevSecOps Dashboard"
VITE_GITHUB_URL="https://github.com/KirkAlton-Class7"
VITE_LINKEDIN_URL="https://www.linkedin.com/in/kirkcochranjr/"
```

> [!NOTE]
> Do not edit below the configuration block unless you know what you are doing.

---

## Dashboard API Configuration

See **`docs/API_CONFIGURATION.md`** *(placeholder – full API guide)*

**User‑configurable variable** (`dashboard_api.py`):

```python
STUDENT_NAME = "Kirk Alton"   # appears in /metadata
BILLING_ACCOUNT_ID = "01BB2F-8195CD-645BC0"   # hardcoded for reliability
```

**Important notes**:

- The API caches static values (subnet name, billing account ID) – first request may be slower, subsequent requests are fast (<0.2s).
- Cost data is written to `/var/tmp/vm-cost.json` (persists across reboots).
- Quotes are read from `/var/www/vm-dashboard/data/quotes.json` (updated by cron).
- The FinOps endpoint uses caching (1 hour for cost/budgets/recommendations, 5 minutes for CPU utilisation).

If VM is already deployed, restart the service after modifying the API:

```bash
sudo systemctl restart dashboard-api.service
```

---

Here’s the optimized version with expected results and notes for each check:

## **Verify Permissions on VM (Post Deployment)**

```bash
# 1. Compute Viewer (subnet fallback) – requires a running VM
VM_NAME=$(gcloud compute instances list --limit=1 --format="value(name)")
ZONE=$(gcloud compute instances list --limit=1 --format="value(zone)")
gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --format="json" | jq '.networkInterfaces[0].subnetwork'
```
**Expected result:** A subnetwork URL (e.g., `"projects/your-project/regions/us-central1/subnetworks/default"`).  
**Note:** If empty or `null`, the service account lacks `roles/compute.viewer` or the VM has no subnet (rare).

```bash
# 2. VM Service Account Scopes (run from the VM itself)
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/scopes | grep cloud-platform
```
**Expected result:** Output contains `https://www.googleapis.com/auth/cloud-platform`.  
**Note:** If missing, the VM was created with insufficient scopes. Stop the VM and update scopes to `cloud-platform`.

```bash
# 3. Final API Tests (run after VM deployment, on the VM)
curl -s http://127.0.0.1:8080/api/dashboard | jq '.meta.dashboardName'
```
**Expected result:** The dashboard name you configured (e.g., `"DevSecOps Dashboard"`).  
**Note:** If empty or error, the API service is not running. Check with `sudo systemctl status dashboard-api.service`.

```bash
curl -s http://127.0.0.1:8080/api/finops | jq '.summaryCards'
```
**Expected result:** A JSON array with four summary cards (Total Cost MTD, Forecast EOM, Potential Savings, CUD Coverage). Values may be `"0.00"` if no data yet.  
**Note:** If you see `"Error building FinOps data"`, check the API logs (`sudo journalctl -u dashboard-api.service -n 50`). This often indicates missing IAM roles or BigQuery export not configured.

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

| Provider     | Metadata           | FinOps Support           | Auto‑deploy  |
| ------------ | ------------------ | ------------------------ | ------------ |
| **GCP**      | Full               | Full (BigQuery, etc.)    | cron         |
| **Azure**    | Partial            | None (planned)           | cron         |
| **AWS**      | Partial            | None (planned)           | cron         |
| **Local VM** | fallback detection | None                     | if available |

> [!NOTE]
> FinOps features are only available on GCP. The DevSecOps dashboard works on any Linux VM with internet access.

---

## Troubleshooting Quick Commands

| Check | Command |
|-------|---------|
| API service status | `sudo systemctl status dashboard-api.service` |
| API response (DevSecOps) | `curl -s http://localhost:8080/api/dashboard | jq '.meta.dashboardName'` |
| API response (FinOps) | `curl -s http://localhost:8080/api/finops | jq '.summaryCards'` |
| Nginx status | `sudo systemctl status nginx` |
| Frontend through nginx | `curl -s http://localhost/ | grep -o "<title>"` |
| Bootstrap logs | `sudo tail -100 /var/log/bootstrap.log` |
| Startup script logs | `sudo tail -100 /var/log/startup-script.log` |
| API logs | `sudo journalctl -u dashboard-api.service -n 50` |
| Billing account ID test | `curl -s http://localhost:8080/api/dashboard | jq '.identity.billingAccountId'` |

---

## Known Limitations

- **Cost estimation** (DevSecOps card) is heuristic (static price × uptime). It is **not** a real billing API call. For real cost data, use the FinOps dashboard.
- **External IP fallback** uses `ifconfig.me`; if the VM has no internet, external IP will show `unknown`.
- **Azure / AWS** support is partial; the dashboard is primarily tested on GCP.
- **Clipboard** requires HTTPS (see the dedicated section above).
- **FinOps data** requires BigQuery billing export, which takes up to 24 hours to populate after first setup.