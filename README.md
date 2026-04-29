# VM Dashboard

A real‑time infrastructure and cost monitoring dashboard that deploys automatically on **GCP**.

It provides live system data and metrics for **DevSecOps**, and includes a mode with **FinOps insights** (cost trends, budgets, rightsizing, idle resources). Both dashboard modes include a particle screensaver, an international photo gallery, inspirational quotes, and a terminal‑style text mode.

Provides:

* System metrics (CPU, memory, disk, load, uptime)
* **FinOps insights** (BigQuery cost trends, budgets, rightsizing, idle resources)
* API-driven observability with paginated system logs
* Sort, filter, search, and view-all workflows for logs, services, and FinOps lists
* Clipboard-friendly dashboard snapshots, JSON payload exports, widget snapshots, and row copies with Manual Copy fallback on public HTTP
* Header diagnostic warning when mock or fallback data is being displayed
* Lightweight UI modes (terminal + visual)

DevSecOps system health is collected locally from the VM and GCP metadata. FinOps data uses GCP APIs and BigQuery billing export when configured.

---

## Documentation

All detailed setup and configuration lives in `docs/`. Review in this order:

1. **[Features and Roadmap](./docs/FEATURES.md)** – capabilities (DevSecOps + FinOps)
2. **[Prerequisites](./docs/PREREQUISITES.md)** – IAM, APIs, billing export, service accounts
3. **[API Configuration](./docs/API_CONFIG.md)** – `scripts/dashboard_api.py` settings (IDs, TTLs, flags)
4. **[App Configuration](./docs/APP_CONFIG.md)** – bootstrap + UI settings
5. **[Quick Start](./docs/QUICKSTART.md)** – deploy VM → run → access dashboard

> Full FinOps requires **BigQuery billing export + proper IAM**.
> Without it, FinOps API sections return empty values; the React FinOps view falls back to bundled mock data only when the API request fails.

---

## Terraform Deployment

This project supports both manual HTTP deployment and Terraform-managed HTTPS deployment.

| Deployment path | Result | Notes |
| --- | --- | --- |
| **HTTP ClickOps VM** | `http://<VM_EXTERNAL_IP>` | Use `infra/startup/gcp_startup.sh` as a GCP VM startup script. Requires APIs, IAM, service account scopes, and firewall port `80`. |
| **Terraform HTTPS** | `https://dashboard.<domain>` | Uses GCP for the VM/dashboard infrastructure and AWS Route 53 for DNS. Certbot runs on the VM to issue the Let's Encrypt certificate. |

The Terraform stack can manage:

* GCP VM, VPC/subnet, NAT, firewall, static IP, service account, and IAM roles
* AWS Route 53 `A` record for the dashboard hostname
* VM metadata used by the startup script for hostname and Let's Encrypt email
* HTTPS firewall access on port `443`

Certificate private keys are intentionally **not** managed directly by Terraform. Certbot stores them on the VM under `/etc/letsencrypt`.

Terraform setup docs:

* **[Terraform HTTPS with GCP + Route 53](./docs/terraform_docs/HTTPS_SETUP.md)** – full HTTPS deployment flow
* **[Terraform Service Account Billing Admin Setup](./docs/terraform_docs/SA_CONFIG.md)** – one-time billing IAM setup

---

## Quick Reference

* **Endpoints**

  * `/healthz` – health check
  * `/metadata` – instance info
  * `/api/dashboard` – infra metrics
  * `/api/finops` – cost + optimization data
  * `/api/config` – static API settings
  * `/api/logs` – paginated journal logs with `limit`, `offset`, and optional `minutes`

* **Copy/export controls**

  * Header camera button – copies the current DevSecOps or FinOps dashboard snapshot
  * Header `{}` button – copies the current DevSecOps or FinOps dashboard JSON payload
  * System Logs copy actions – copy JSON with a top-level `system_logs` array
  * Text mode – `[C] COPY`, `[J] COPY JSON`, and `[LS] SNAPSHOT` inside the `[LL] ALL LOGS` modal

* **Repository**
  [https://github.com/KirkAlton-Class7/devsecops-vm-dashboard](https://github.com/KirkAlton-Class7/devsecops-vm-dashboard)

* **License**
  MIT

---

## License

MIT – free to use, modify, and distribute.
