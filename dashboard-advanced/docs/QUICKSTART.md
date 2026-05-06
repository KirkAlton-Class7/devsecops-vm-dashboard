# Quickstart

## Prerequisites & IAM Setup

> See [GCP Prerequisites Runbook](./PREREQUISITES.md)

**Quick summary:**

* **Enable APIs**: `compute`, `bigquery`, `monitoring`, `logging`, `recommender`, `billingbudgets`, `cloudbilling`, `secretmanager`, `pubsub`.
* **Create a custom service account** (recommended) or use the default Compute Engine service account.
* **Grant IAM roles**:
  * `roles/billing.viewer` on the **billing account**
  * `roles/compute.viewer`, `roles/bigquery.dataViewer`, `roles/bigquery.jobUser`, `roles/monitoring.viewer`, `roles/recommender.viewer` on the **project**.
  * `roles/secretmanager.secretAccessor` on the four dashboard auth secrets.
* **Set up BigQuery billing export** to a dataset named `billing_export`.
* **Create Secret Manager auth secrets** for DevSecOps and FinOps.
* **Attach the four auth secret IDs as VM custom metadata** when using ClickOps.
* **Ensure the VM is created with the `cloud-platform` OAuth scope**.

The FinOps dashboard will show real data only after these prerequisites are met and the BigQuery export has populated (up to 24 hours).

---

## Quick Start

> [!IMPORTANT]
> Deployment is fully automated using a startup script.

This project supports two deployment paths:

| Path | Result | Best for |
| --- | --- | --- |
| **HTTP ClickOps VM deployment** | Serves the dashboard at `http://<VM_EXTERNAL_IP>` | Labs, demos, fast manual GCP Console deployment |
| **Terraform HTTPS deployment** | Serves the dashboard at `https://dashboard.<domain>` | Repeatable infrastructure with DNS and TLS |

The dashboard application does not require HTTPS to show real data. Real versus fallback data depends on GCP APIs, IAM roles, service account scopes, and BigQuery billing export. HTTPS only changes how browsers securely connect to the already-running dashboard.

> [!TIP]
> For repeated Terraform lab rebuilds, enable `letsencrypt_staging_enabled=true` to test DNS, Nginx, Certbot, and redirect behavior without consuming Let’s Encrypt production certificate limits. Staging certificates are not browser-trusted, so disable staging for production or final demos.

---

## HTTP ClickOps Deployment

Use this path when creating a VM manually in the GCP Console and pasting a startup script into the VM metadata field.

1. **Copy the appropriate bootstrap script** into your VM’s user‑data / startup script field.
   * Use `dashboard-advanced/infra/startup/gcp_startup.sh` as the **wrapper** – it installs `git`, clones the repo to `/opt/deploy`, and then runs `dashboard-advanced/scripts/bootstrap/app_bootstrap.sh`.

![GCP VM creation page showing the startup script metadata field populated with gcp_startup.sh](assets/32_gcp_vm_startup_script.png)

2. **Add the required dashboard metadata** under the VM custom metadata section

> [!NOTE]
> Metadata can be set at the **project level** (default key-value pairs for all VMs in the project) or at the **VM level** (key-value pairs for a specific VM). If the same metadata **key** is defined at both levels, the **VM-level value overrides the project-level value** for that VM.

![VM custom metadata with auth secret ID keys and values for ClickOps deployment](assets/55_auth_secret_metadata.png)

| Metadata key | Value |
| --- | --- |
| `dashboard-dev-auth-user-secret` | `vm-dashboard-dev-username` |
| `dashboard-dev-auth-password-secret` | `vm-dashboard-dev-password` |
| `dashboard-finops-auth-user-secret` | `vm-dashboard-finops-username` |
| `dashboard-finops-auth-password-secret` | `vm-dashboard-finops-password` |

In VM metadata, the **key** describes which credential the startup script should load. The **value** is the Secret Manager secret ID. Do not put the actual username or password in VM metadata.

> [!IMPORTANT]
> For ClickOps HTTPS testing, add the metadata below and fill placeholders with your FQDN and email.
>| Metadata key | Value |
>| --- | --- |
>| `dashboard-hostname` | `FULLY-QUALIFIED-DOMAIN-NAME` |
>| `letsencrypt-email` | `VERIFICATION-EMAIL` |
>| `letsencrypt-staging` | `true` |

> [!NOTE]
> The metadata values are Secret Manager secret IDs, not usernames or passwords. If any required auth metadata is missing and no environment fallback credentials are provided, bootstrap fails closed with `DevSecOps Basic Auth username and password must be provided by Secret Manager or environment variables`. In that failed state, Nginx may remain on the default **Welcome to nginx** page because the dashboard Nginx site was never configured.


If creating the VM from the CLI, run these commands from the repo root to pass the same metadata keys:

```bash
PROJECT_ID=kirk-devsecops-sandbox # Replace with your project ID
FQDN=dashboard.kirkdevsecops.com # Replace with your FQDN
EMAIL=your.email@example.com # Replace with your email
STAGING_VAR=true # For production, replace with false

gcloud compute instances create vm-dashboard \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --service-account="vm-dashboard@${PROJECT_ID}.iam.gserviceaccount.com" \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --metadata-from-file=startup-script=dashboard-advanced/infra/startup/gcp_startup.sh \
  --metadata=dashboard-dev-auth-user-secret=vm-dashboard-dev-username,dashboard-dev-auth-password-secret=vm-dashboard-dev-password,dashboard-finops-auth-user-secret=vm-dashboard-finops-username,dashboard-finops-auth-password-secret=vm-dashboard-finops-password,dashboard-hostname=${FQDN},letsencrypt-staging=${STAGING_VAR},letsencrypt-email=${EMAIL}
```

3. **Launch a VM** (Debian 11 or Ubuntu 20.04/22.04 recommended).

4. **Wait 5–10 minutes** while the scripts:
   * Install basic tools (nginx, Python, Node.js, git, **Google Cloud SDK**)
   * Clone the repository to `/opt/deploy`
   * Install Python packages (`google-cloud-bigquery`, `google-cloud-monitoring`, etc.)
   * Create a systemd service for the Python API (`dashboard-api.service`) on port 8080
   * Build the React frontend
   * Configure Nginx to serve the dashboard and proxy `/api/` and `/metadata` to the Python API
   * Stage shared quote/gallery assets, set up pricing (monthly), and configure auto-deploy (every 15 min)
   * Start everything

5. **Open the VM’s public IP** in your browser at `http://<VM_EXTERNAL_IP>`.

![Dashboard loading successfully over HTTP using the VM external IP](assets/33_http_dashboard_external_ip.png)

The HTTP ClickOps path does **not** configure HTTPS, Certbot, Route 53, or a TLS certificate.

> [!TIP]
> Logs are written to `/var/log/bootstrap.log` and `/var/log/startup-script.log` for troubleshooting.

> [!IMPORTANT]
> The dashboard may take up to 10 minutes to fully install, build, and populate images and quotes.
> FinOps data may take up to 24 hours to appear after enabling BigQuery billing export.

---

## HTTPS Terraform Deployment

Use this path when deploying with Terraform and a real DNS name.

The Terraform deployment can coordinate:

- GCP VM creation
- GCP static external IP
- firewall rules for `80` and `443`
- GCP service account and IAM roles
- AWS Route 53 `A` record
- instance metadata for the dashboard hostname, Let’s Encrypt email, and DevSecOps/FinOps Secret Manager IDs

The VM startup script then:

1. installs the dashboard over HTTP first
2. reads `dashboard-hostname` and `letsencrypt-email` from GCP metadata
3. waits until DNS resolves to the VM public IP
4. installs Certbot in `/opt/certbot-venv`
5. requests a Let’s Encrypt certificate
6. updates Nginx to redirect HTTP to HTTPS

Expected HTTPS URL: `https://dashboard.kirkdevsecops.com`

![Dashboard loading successfully over HTTPS at the dashboard hostname](assets/34_https_dashboard_success.png)

> [!NOTE]
> Let’s Encrypt certificates are issued for domain names, not raw IP addresses. Test HTTPS with the hostname, not `https://<VM_EXTERNAL_IP>`.

### HTTPS Requirements

- A public domain name, such as `kirkdevsecops.com`
- A public DNS record pointing the dashboard hostname to the VM static IP
- inbound firewall access for ports `80` and `443`
- VM internet egress so Certbot can reach Let’s Encrypt
- a Let’s Encrypt contact email
- Nginx serving HTTP before Certbot runs

### HTTPS Troubleshooting

| Check | Command |
| --- | --- |
| DNS record | `dig +short dashboard.kirkdevsecops.com` |
| HTTP response | `curl -I http://dashboard.kirkdevsecops.com` |
| HTTPS response | `curl -I https://dashboard.kirkdevsecops.com` |
| HTTPS setup service | `sudo systemctl status vm-dashboard-https.service` |
| HTTPS setup logs | `sudo journalctl -u vm-dashboard-https.service --no-pager` |
| Certbot certificates | `sudo /opt/certbot-venv/bin/certbot certificates` |
| Renewal dry run | `sudo /opt/certbot-venv/bin/certbot renew --dry-run` |

> [!NOTE]
> If HTTP loads the dashboard but HTTPS hangs, DNS and the React build are probably working. Check whether Nginx is listening on `443` with `sudo ss -ltnp | grep ':443'`, then start the retry service with `sudo systemctl start vm-dashboard-https.service`. The wrapper owns Certbot setup through `vm-dashboard-https.service`; `app_bootstrap.sh` should not run Certbot inline.

> [!WARNING]
> If Certbot reports `too many certificates (5) already issued for this exact set of identifiers`, Let’s Encrypt has rate-limited the hostname. Stop the retry timer with `sudo systemctl disable --now vm-dashboard-https.timer`, use HTTP temporarily, and retry after the UTC time shown in the Certbot log.

See **[Terraform HTTPS with GCP + Route 53](./terraform_docs/HTTPS_SETUP.md)** for the full infrastructure setup.

---

## Dashboard Customization (Bootstrap Script)

See **[`docs/APP_CONFIG.md`](./APP_CONFIG.md)**.

**Quick variables** (edit at the top of `app_bootstrap.sh`):

```bash
DASHBOARD_APP_NAME="GCP Deployment"
DASHBOARD_TAGLINE="Infrastructure health and activity"
DASHBOARD_USER="Kirk Alton"
DASHBOARD_NAME="DevSecOps Dashboard"
VITE_GITHUB_URL="https://github.com/KirkAlton-Class7"
VITE_LINKEDIN_URL="https://www.linkedin.com/in/kirkcochranjr/"
```

Protected credentials should come from GCP Secret Manager for production. DevSecOps and FinOps use separate Basic Auth pairs.

Set the project and VM dashboard service account first:

```bash
PROJECT_ID="$(gcloud config get-value project)"
SA_EMAIL="vm-dashboard@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable secretmanager.googleapis.com pubsub.googleapis.com
```

Create or update the four auth secrets:

```bash
for SECRET_ID in \
  vm-dashboard-dev-username \
  vm-dashboard-dev-password \
  vm-dashboard-finops-username \
  vm-dashboard-finops-password
do
  gcloud secrets describe "${SECRET_ID}" --project="${PROJECT_ID}" >/dev/null 2>&1 || \
    gcloud secrets create "${SECRET_ID}" \
      --project="${PROJECT_ID}" \
      --replication-policy="automatic"
done

printf '%s' 'dashboard' | \
  gcloud secrets versions add vm-dashboard-dev-username \
    --project="${PROJECT_ID}" \
    --data-file=-

read -rsp "DevSecOps password: " DEV_PASSWORD && echo
printf '%s' "${DEV_PASSWORD}" | \
  gcloud secrets versions add vm-dashboard-dev-password \
    --project="${PROJECT_ID}" \
    --data-file=-

printf '%s' 'finops' | \
  gcloud secrets versions add vm-dashboard-finops-username \
    --project="${PROJECT_ID}" \
    --data-file=-

read -rsp "FinOps password: " FINOPS_PASSWORD && echo
printf '%s' "${FINOPS_PASSWORD}" | \
  gcloud secrets versions add vm-dashboard-finops-password \
    --project="${PROJECT_ID}" \
    --data-file=-
```

![Secret Manager showing the dashboard DevSecOps and FinOps auth secrets](assets/52_secret_manager_auth_secrets.png)

Grant the VM dashboard service account read access to only those four secrets:

```bash
for SECRET_ID in \
  vm-dashboard-dev-username \
  vm-dashboard-dev-password \
  vm-dashboard-finops-username \
  vm-dashboard-finops-password
do
  gcloud secrets add-iam-policy-binding "${SECRET_ID}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done
```

Terraform passes the secret IDs to the VM as metadata. The bootstrap fetches the secret values at runtime and writes only hashed password files to Nginx.

Manage the Secret Manager notification topic outside Terraform so it stays coupled to the secrets and survives `terraform destroy`:

```bash
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")"
SECRET_MANAGER_SERVICE_AGENT="service-${PROJECT_NUMBER}@gcp-sa-secretmanager.iam.gserviceaccount.com"

gcloud beta services identity create \
  --service="secretmanager.googleapis.com" \
  --project="${PROJECT_ID}"

gcloud pubsub topics describe vm-dashboard-secret-events --project="${PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud pubsub topics create vm-dashboard-secret-events \
    --project="${PROJECT_ID}"

gcloud pubsub topics add-iam-policy-binding vm-dashboard-secret-events \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${SECRET_MANAGER_SERVICE_AGENT}" \
  --role="roles/pubsub.publisher"

NEXT_ROTATION="$(python3 -c 'from datetime import datetime, timezone, timedelta; print((datetime.now(timezone.utc)+timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ"))')"

for SECRET_ID in \
  vm-dashboard-dev-username \
  vm-dashboard-dev-password \
  vm-dashboard-finops-username \
  vm-dashboard-finops-password
do
  gcloud secrets update "${SECRET_ID}" \
    --project="${PROJECT_ID}" \
    --add-topics="projects/${PROJECT_ID}/topics/vm-dashboard-secret-events"
done

for SECRET_ID in vm-dashboard-dev-password vm-dashboard-finops-password
do
  gcloud secrets update "${SECRET_ID}" \
    --project="${PROJECT_ID}" \
    --next-rotation-time="${NEXT_ROTATION}" \
    --rotation-period="7776000s"
done
```

The topic ID is `vm-dashboard-secret-events`. Secret Manager uses the full topic resource path: `projects/${PROJECT_ID}/topics/vm-dashboard-secret-events`.

> [!IMPORTANT]
> The VM service account reads the secrets through `roles/secretmanager.secretAccessor`. The Secret Manager service agent publishes secret events through `roles/pubsub.publisher` on the Pub/Sub topic.
> The Secret Manager service agent does not need permission to read secret values.

![Pub/Sub topic for dashboard Secret Manager events](assets/53_pubsub_secret_events_topic.png)

![Secret Manager password rotation settings for dashboard auth password](assets/54_secret_manager_password_rotation_settings.png)

> [!NOTE]
> Do not edit below the configuration block unless you know what you are doing.

---

## Dashboard API Configuration

See **[`docs/API_CONFIG.md`](./API_CONFIG.md)**.

**User-configurable variable** (`dashboard-advanced/scripts/dashboard_api.py`):

```python
STUDENT_NAME = "Kirk Alton"
BILLING_ACCOUNT_ID = "01BB2F-8195CD-645BC0"
```

**Important notes**:

- The API caches dashboard data briefly in memory, writes last-known-good DevSecOps and FinOps snapshots under `/var/cache/vm-dashboard`, and uses a default 10-minute VM-local FinOps payload cache.
- `/api/logs` reads paginated `journalctl` rows and supports `limit`, `offset`, and optional `minutes`. When `minutes` is set, it queries journalctl with `--since`.
- Public browser access is limited to summary endpoints until a user signs in. Nginx protects `/api/dashboard`, `/api/finops`, `/api/logs`, and `/metadata` with Basic Auth.
- Heuristic DevSecOps cost data is written to `/var/tmp/vm-cost.json` (persists across reboots).
- Quotes are read from `/var/www/vm-dashboard/data/quotes.json`, staged from `shared/assets/quotes/quotes.json` during bootstrap and auto-deploy.
- Real FinOps cost data is read from the `billing_export` BigQuery dataset.

If VM is already deployed, restart the service after modifying the API:

```bash
sudo systemctl restart dashboard-api.service
```

---

## **Verify Permissions on VM (Post Deployment)**

```bash
# 1. Compute Viewer (subnet fallback) – requires a running VM
VM_NAME=$(gcloud compute instances list --limit=1 --format="value(name)")
ZONE=$(gcloud compute instances list --limit=1 --format="value(zone)")
gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --format="json" | jq '.networkInterfaces[0].subnetwork'
```
> [!NOTE]
> Expected result: a subnetwork URL, such as `"projects/your-project/regions/us-central1/subnetworks/default"`.
> If empty or `null`, the service account lacks `roles/compute.viewer` or the VM has no subnet.

```bash
# 2. VM Service Account Scopes (run from the VM itself)
curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/scopes | grep cloud-platform
```
> [!NOTE]
> Expected result: output contains `https://www.googleapis.com/auth/cloud-platform`.
> If missing, the VM was created with insufficient scopes. Stop the VM and update scopes to `cloud-platform`.

![GCP VM details page showing service account and cloud-platform OAuth scope](assets/35_gcp_vm_service_account_scope.png)

```bash
# 3. Final API Tests (run after VM deployment, on the VM)
curl -s http://127.0.0.1:8080/api/dashboard | jq '.meta.dashboardName'
```
> [!NOTE]
> Expected result: the dashboard name you configured, such as `"DevSecOps Dashboard"`.
> If empty or error, the API service is not running. Check with `sudo systemctl status dashboard-api.service`.

```bash
curl -s http://127.0.0.1:8080/api/finops | jq '.summaryCards'
```
> [!NOTE]
> Expected result: a JSON array with four summary cards: Total Cost MTD, Forecast EOM, Potential Savings, and CUD Coverage.
> Before FinOps sign-in, Total Cost MTD and Forecast EOM display `"Protected"` in the public summary cards. After FinOps sign-in, `/api/finops` returns live calculated values. If you see `"Error building FinOps data"`, check the API logs with `sudo journalctl -u dashboard-api.service -n 50`. This often indicates missing IAM roles or an unconfigured BigQuery export.

```bash
curl -s "http://127.0.0.1:8080/api/logs?limit=5&offset=0&minutes=10" | jq '.logs[0]'
```
> [!NOTE]
> Expected result: a log object with `time`, `level`, `source`, and `message`.
> Log timestamps are emitted as ISO 8601 UTC strings, such as `2026-04-27T14:58:42Z`. The React UI formats them for local display.

> [!NOTE]
> These local API tests run directly against `127.0.0.1:8080` and bypass Nginx. Public browser traffic goes through Nginx and requires the DevSecOps or FinOps username/password for protected endpoints.

### Verify Copy and Snapshot Controls

The graphical DevSecOps and FinOps headers include two copy controls:

| Button | Purpose |
| ------ | ------- |
| Camera icon | Copies the current dashboard snapshot |
| `{}` icon | Copies the current dashboard JSON payload |

Text Mode includes:

| Control | Purpose |
| ------- | ------- |
| `[C] COPY` | Copies the DevSecOps dashboard text snapshot |
| `[J] COPY JSON` | Copies the DevSecOps dashboard JSON payload |
| `[LL]` then `[LS] SNAPSHOT` | Opens all logs, then copies the loaded/filter-matched logs as JSON |
| `[SO] SIGN OUT` | Signs out of DevSecOps |
| `[SE] SIGN OUT EVERYWHERE` | Clears all dashboard sessions |

[PICTURE: Screenshot of Advanced Text Mode showing the updated cyan grid interface and top control row]

![Text Mode controls showing sign-out and sign-out everywhere actions](assets/50_text_mode_signout_controls.png)

![Text Mode dashboard showing copy controls in context](assets/36_text_mode.png)

![Text Mode all logs view showing loaded log rows](assets/36_text_mode_all_logs.png)

System Logs copy actions use this JSON shape:

```json
{
  "system_logs": [
    {
      "timestamp": "2026-04-27T14:58:42Z",
      "level": "WARN",
      "component": "storage",
      "message": "Root disk at 92% after npm build artifacts; 4.0 GB free"
    }
  ]
}
```

Dashboard JSON payload structure is documented in [API Configuration](./API_CONFIG.md#clipboard-json-payload-structure).

---

## Local Development

### Clone the repository

```bash
git clone https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git
cd devsecops-vm-dashboard/dashboard-advanced/dashboard
```

### Run the React frontend

```bash
npm install
npm run dev
```

Access: `http://localhost:5173`

### Run the Python API locally

```bash
cd ..
python3 ../scripts/dashboard_api.py
```

The API will listen on `http://localhost:8080`.

> [!NOTE]
> The Vite dev server does not define an API proxy. In local development, frontend calls to `/api/dashboard` on `localhost:5173` fall back to mock dashboard data unless you serve through Nginx or add a local proxy.
> `/api/logs` is intercepted in Vite development mode and served from `dashboard-advanced/dashboard/src/mockLogs.js`, which keeps the all-logs modal useful for demos without a live `journalctl` backend.

### Test Manual Copy Fallback Locally

To simulate an HTTP/blocked-clipboard browser context during local development, open `http://localhost:5173/?HttpTest=1`.

![Manual Copy modal triggered locally with HttpTest enabled](assets/37_manual_copy_http_test_modal.png)

Copy buttons will use the same Manual Copy modal path that public HTTP deployments use when the browser blocks Clipboard API access. This test flag is local-only and is ignored on the deployed HTTPS dashboard.

---

## Repository Structure

```
devsecops-vm-dashboard/
├── dashboard-advanced/      # Full DevSecOps + FinOps dashboard deployment
│   ├── dashboard/           # React frontend (Vite + Tailwind)
│   │   └── src/
│   │       ├── components/  # React UI components
│   │       ├── config/      # Frontend navigation/config
│   │       ├── data/        # Mock dashboard and FinOps data
│   │       └── utils/       # Clipboard and snapshot formatters
│   ├── scripts/             # API, bootstrap, and pricing scripts
│   ├── infra/startup/       # ClickOps startup wrapper
│   ├── docs/                # Advanced dashboard documentation
│   └── terraform/           # Advanced GCP/Terraform deployment stack
├── dashboard-basic/         # Basic VM dashboard deployment
├── shared/
│   └── assets/
│       ├── quotes/quotes.json
│       └── images/image_gallery/
│           ├── gallery-manifest.json
│           └── *.webp
└── README.md
```

At runtime, the advanced bootstrap stages shared assets into:

```text
/var/www/vm-dashboard/data/quotes.json
/var/www/vm-dashboard/data/gallery-manifest.json
/var/www/vm-dashboard/data/images/
```

The compatibility file `/var/www/vm-dashboard/data/images.json` is also written from `gallery-manifest.json` for older clients.

---

## Cloud Provider Support

| Provider     | Metadata           | FinOps Support           | Auto‑deploy  |
| ------------ | ------------------ | ------------------------ | ------------ |
| **GCP**      | Full               | Full (BigQuery, etc.)    | cron         |
| **Local VM** | fallback detection | None                     | manual/dev   |
| **Azure**    | Not implemented    | None                     | not implemented |
| **AWS**      | Not implemented    | None                     | not implemented |

> [!NOTE]
> FinOps features are only available on GCP. The DevSecOps dashboard works on any Linux VM with internet access.

---

## Troubleshooting Quick Commands

| Check | Command |
|-------|---------|
| API service status | `sudo systemctl status dashboard-api.service` |
| API response (DevSecOps) | `curl -s http://localhost:8080/api/dashboard | jq '.meta.dashboardName'` |
| API response (FinOps) | `curl -s http://localhost:8080/api/finops | jq '.summaryCards'` |
| API response (logs) | `curl -s "http://localhost:8080/api/logs?limit=5&offset=0" | jq '.logs'` |
| Nginx status | `sudo systemctl status nginx` |
| Frontend through nginx | `curl -s http://localhost/ | grep -o "<title>"` |
| Bootstrap logs | `sudo tail -100 /var/log/bootstrap.log` |
| Auto-deploy logs | `sudo tail -100 /var/log/dashboard-deploy.log` |
| Startup script logs | `sudo tail -100 /var/log/startup-script.log` |
| API logs | `sudo journalctl -u dashboard-api.service -n 50` |
| Billing account ID test | `curl -s http://localhost:8080/api/dashboard | jq '.identity.billingAccountId'` |

---

## Known Limitations

- **Cost estimation** (DevSecOps card) is heuristic (static price × uptime). It is **not** a real billing API call. For real cost data, use the FinOps dashboard.
- **External IP fallback** uses `ifconfig.me`; if the VM has no internet, external IP will show `unknown`.
- **Azure / AWS** provider adapters are not implemented in the current codebase.
- **Clipboard API access** usually requires HTTPS or localhost. On public HTTP, copy actions fall back to the Manual Copy modal when the browser blocks clipboard access.
- **Auto-deploy behavior** keeps the existing frontend in place if the Git pull, dependency install, or frontend build fails. Review `/var/log/dashboard-deploy.log` when a pushed update does not appear.
- **FinOps data** requires BigQuery billing export, which takes up to 24 hours to populate after first setup.
- **Let’s Encrypt production certificates are rate-limited.** Repeated Terraform destroy/apply cycles or repeated Certbot retries can exhaust the limit for a hostname:
  - `5` duplicate certificates for the exact same set of domains per rolling `7` days.
  - The `6th` request for that exact set is blocked until the rolling reset time shown by Certbot.
  - `50` certificates per registered domain per rolling `7` days.
  - `5` failed validations per account, hostname, and hour.

Use unique subdomains for experiments, such as `lab1.example.com`, `lab2.example.com`, or `test.example.com`. For repeated HTTPS testing, use the Let’s Encrypt staging environment before requesting production certificates.

Official references:

- [Let’s Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Certbot User Guide](https://certbot.eff.org/docs/using.html)
- [Certbot Testing and Staging](https://certbot.eff.org/docs/using.html#testing)
- [Let’s Encrypt Staging Environment](https://letsencrypt.org/docs/staging-environment/)
- [Let’s Encrypt Challenge Types](https://letsencrypt.org/docs/challenge-types/)
- [Let’s Encrypt Integration Guide](https://letsencrypt.org/docs/integration-guide/)
