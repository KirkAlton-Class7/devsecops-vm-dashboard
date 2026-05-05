# Quickstart

## Goal

Deploy **Basic VM Dashboard** on a GCP VM with minimal prerequisites.

The dashboard does not need Cloud Monitoring, BigQuery, Recommender, Secret Manager, billing export, custom dashboard credentials, or a custom VM service account.

## Required Prerequisites

- A GCP project with Compute Engine available
- A VM with an external IP
- Firewall access to TCP `80`
- Optional firewall access to TCP `443` for HTTPS

Enable Compute Engine if needed:

```bash
gcloud services enable compute.googleapis.com
```

## HTTP ClickOps Deployment

1. Create a VM with Debian 11.
2. Allow HTTP traffic.
3. Paste `dashboard-basic/infra/startup/gcp_startup.sh` into the VM startup script field.
4. Start the VM.
5. Wait for startup to finish.

Check progress over SSH:

```bash
sudo tail -f /var/log/bootstrap.log
sudo tail -f /var/log/startup-script.log
```

Open:

```text
http://<VM_EXTERNAL_IP>
```

The startup wrapper clones the root repository, runs `dashboard-basic/scripts/bootstrap/app_bootstrap.sh`, and stages optional shared assets from:

```text
shared/assets/quotes/quotes.json
shared/assets/images/image_gallery/gallery-manifest.json
shared/assets/images/image_gallery/*.webp
```

## ClickOps CLI Example

Run this from the repository root so the startup script path resolves correctly:

```bash
PROJECT_ID="$(gcloud config get-value project)"

gcloud compute instances create basic-vm-dashboard \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --tags=http-server,https-server,ssh \
  --metadata-from-file=startup-script=dashboard-basic/infra/startup/gcp_startup.sh
```

Create simple firewall rules if your project does not already have them:

```bash
gcloud compute firewall-rules create allow-basic-dashboard-http \
  --allow=tcp:80 \
  --target-tags=http-server \
  --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create allow-basic-dashboard-https \
  --allow=tcp:443 \
  --target-tags=https-server \
  --source-ranges=0.0.0.0/0
```

## Optional HTTPS Metadata

For HTTPS, add these VM metadata keys before startup:

| Metadata key | Value |
| --- | --- |
| `dashboard-repo-url` | Optional Git repository URL. Defaults to `https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git`; the wrapper runs the Basic dashboard from `dashboard-basic/` |
| `dashboard-hostname` | Fully qualified domain name, for example `basic-dashboard.example.com` |
| `letsencrypt-email` | Email for Let’s Encrypt registration |
| `letsencrypt-staging` | `true` for lab testing, `false` or omitted for production |

Example:

```bash
FQDN=basic-dashboard.example.com
EMAIL=you@example.com

gcloud compute instances add-metadata basic-vm-dashboard \
  --zone=us-central1-a \
  --metadata=dashboard-hostname=${FQDN},letsencrypt-email=${EMAIL},letsencrypt-staging=true
```

> [!TIP]
> Use Let’s Encrypt staging mode while testing DNS, firewall, and Nginx. Staging certificates are not browser-trusted, but they avoid production certificate rate limits.

## Terraform Deployment

```bash
cd terraform
terraform init
terraform apply \
  -var="project_id=YOUR_GCP_PROJECT_ID" \
  -var="root_domain=example.com"
```

Terraform outputs:

- `dashboard_http_url`
- `dashboard_https_url`
- `vm_external_ip`
- `ssh_command`

## Troubleshooting

If you still see the default Nginx page:

```bash
sudo systemctl status nginx dashboard-api --no-pager
sudo nginx -T | grep -A20 basic-vm-dashboard
sudo tail -100 /var/log/startup-script.log
```

If the frontend does not load:

```bash
curl -i http://127.0.0.1/
curl -i http://127.0.0.1/api/dashboard
ls -la /var/www/basic-vm-dashboard
```
