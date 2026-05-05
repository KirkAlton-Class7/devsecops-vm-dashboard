# Basic VM Dashboard

A lightweight GCP VM dashboard for fast smoke tests, labs, and simple deployment validation.

This project is intentionally smaller than the full VM dashboard:

- Basic VM health only
- No FinOps mode
- No system logs widget or logs API
- No load trend widget
- No Cloud Monitoring, BigQuery, Recommender, Billing Budgets, Secret Manager, or dashboard Basic Auth requirement
- No custom VM service account required

The dashboard reads local Linux system data and the GCE metadata server when available. If a metadata field is unavailable, the UI shows `unknown`.

## What It Shows

- CPU, memory, disk, and uptime
- Project, instance ID, instance name, hostname, and machine type
- VPC, subnet, internal IP, and external IP when available
- Region, zone, and uptime
- Nginx, API, and static build health
- Local health endpoints

## ClickOps Deployment

Use `dashboard-basic/infra/startup/gcp_startup.sh` as the VM startup script.

Required VM settings:

- Debian 11 image
- External IP
- Firewall allows TCP `80`
- Optional: firewall allows TCP `443` when using HTTPS

No custom service account or special dashboard IAM roles are required.

The startup wrapper clones `https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git` by default, then runs `dashboard-basic/scripts/bootstrap/app_bootstrap.sh`. To deploy from a fork, add VM metadata key `dashboard-repo-url` with your repository URL.

After startup completes, open:

```text
http://<VM_EXTERNAL_IP>
```

## Optional HTTPS

If you provide these VM metadata keys, the startup wrapper can run Certbot after the HTTP dashboard is online:

| Metadata key | Example value |
| --- | --- |
| `dashboard-hostname` | `basic-dashboard.example.com` |
| `letsencrypt-email` | `you@example.com` |
| `letsencrypt-staging` | `true` |

Use `letsencrypt-staging=true` for repeated lab testing so you do not consume Let’s Encrypt production certificate limits. Staging certificates are not browser-trusted.

## Terraform

Terraform is included for portability. The stack creates:

- Compute API enablement
- Lightweight VPC
- Firewall rules for SSH, HTTP, and HTTPS
- Static external IP
- One VM running the startup script
- Optional Certbot HTTPS metadata

Example:

```bash
cd terraform
terraform init
terraform apply \
  -var="project_id=YOUR_GCP_PROJECT_ID" \
  -var="root_domain=example.com"
```

With HTTPS metadata:

```bash
terraform apply \
  -var="project_id=YOUR_GCP_PROJECT_ID" \
  -var="root_domain=example.com" \
  -var="dashboard_subdomain=basic-dashboard" \
  -var="letsencrypt_email=you@example.com" \
  -var="letsencrypt_staging_enabled=true"
```

Create the DNS `A` record outside Terraform by pointing the chosen hostname to the `vm_external_ip` output.

## Shared Assets

The basic dashboard stages optional shared static assets from the root repository during bootstrap and auto-deploy:

```text
shared/assets/quotes/quotes.json
shared/assets/images/image_gallery/gallery-manifest.json
shared/assets/images/image_gallery/*.webp
```

They are served from:

```text
/var/www/basic-vm-dashboard/data/quotes.json
/var/www/basic-vm-dashboard/data/gallery-manifest.json
/var/www/basic-vm-dashboard/data/images/
```

## Endpoints

| Endpoint | Description |
| --- | --- |
| `/healthz` | Plain-text health check |
| `/metadata` | Basic VM metadata JSON |
| `/api/dashboard` | Basic dashboard JSON |
| `/api/dashboard/summary` | Same basic dashboard payload |

## Repository

[https://github.com/KirkAlton-Class7/basic-vm-dashboard](https://github.com/KirkAlton-Class7/basic-vm-dashboard)

## License

MIT
