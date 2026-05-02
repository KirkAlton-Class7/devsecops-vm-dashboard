# Terraform GCP VM Dashboard with Route 53 HTTPS

## Purpose

This runbook explains the Terraform deployment model for serving the VM dashboard over HTTPS.

The Terraform setup is multi-cloud:

| Provider | Responsibility |
| --- | --- |
| `google` | GCP VM, VPC/subnet, firewall, static IP, service account, IAM roles |
| `aws` | Route 53 DNS record for the dashboard hostname |

The certificate itself is issued on the VM by Certbot. Terraform does not store the certificate private key.

---

## Deployment Flow

1. Terraform reserves a GCP static external IP.
2. Terraform creates or looks up the Route 53 hosted zone.
3. Terraform creates an `A` record for the dashboard hostname.
4. Terraform creates the GCP VM and passes metadata:
   - `dashboard-hostname`
   - `letsencrypt-email`
5. The VM startup script installs the dashboard over HTTP.
6. The HTTPS helper waits until DNS resolves to the VM public IP.
7. Certbot requests a Let’s Encrypt certificate.
8. Certbot updates Nginx for HTTPS and HTTP-to-HTTPS redirect.

Expected result: `https://dashboard.kirkdevsecops.com`

![Successful Terraform apply showing dashboard URL and VM external IP outputs](../assets/38_terraform_apply_outputs.png)

---

## Required Terraform Providers

The Terraform configuration requires both providers:

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

The Google provider deploys the VM. The AWS provider manages Route 53.

---

## Provider Configuration

```hcl
provider "google" {
  project = "kirk-devsecops-sandbox"
  region  = "us-central1"
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}
```

If you use the default AWS credential chain, leave `aws_profile = null`.

If you use a named AWS CLI profile, set it with a tfvars file or CLI variable:

```bash
terraform apply -var="aws_profile=your-profile-name"
```

---

## DNS Variables

The deployment uses these variables:

```hcl
variable "root_domain" {
  default = "kirkdevsecops.com"
}

variable "dashboard_subdomain" {
  default = "dashboard"
}

variable "dashboard_hostname" {
  default  = null
  nullable = true
}

variable "create_route53_record" {
  default = true
}

variable "manage_route53_in_terraform" {
  default = false
}
```

By default, Terraform builds the hostname from `dashboard_subdomain.root_domain`.

Default result: `dashboard.kirkdevsecops.com`

If you want to override the full hostname directly, set `dashboard_hostname = "custom.kirkdevsecops.com"`.

---

## Route 53 Hosted Zone Behavior

The default behavior assumes the public hosted zone already exists in Route 53 with `manage_route53_in_terraform = false`.

Terraform looks up the hosted zone and creates the dashboard `A` record.

Use this if the domain was already registered and configured in AWS.

If you intentionally want Terraform to create the hosted zone, set `manage_route53_in_terraform = true`.

Only use this when you understand the Route 53 nameserver implications. Creating a new hosted zone does not automatically update registrar nameservers.

---

## DNS Record

Terraform creates:

```hcl
resource "aws_route53_record" "vm_dashboard" {
  count = var.create_route53_record ? 1 : 0

  allow_overwrite = true
  zone_id         = local.route53_zone_id
  name            = local.dashboard_fqdn
  type            = "A"
  ttl             = 300
  records         = [google_compute_address.vm_dashboard.address]
}
```

This points `dashboard.kirkdevsecops.com` to the GCP VM static external IP.

![AWS Route 53 hosted zone showing the dashboard A record pointing to the GCP static IP](../assets/39_route53_dashboard_record.png)

---

## Static IP

Terraform reserves a GCP static IP:

```hcl
resource "google_compute_address" "vm_dashboard" {
  name   = "vm-dashboard-ip"
  region = "us-central1"
}
```

The VM uses this IP:

```hcl
access_config {
  nat_ip = google_compute_address.vm_dashboard.address
}
```

This matters because DNS should point at a stable IP, not an ephemeral IP that changes after rebuilds.

![GCP external IP addresses page showing vm-dashboard-ip reserved as a static IP](../assets/40_gcp_static_ip_reserved.png)

---

## Firewall Rules

The dashboard needs:

| Port | Purpose |
| --- | --- |
| `80` | HTTP dashboard access and Let’s Encrypt HTTP validation |
| `443` | HTTPS dashboard access |
| `22` | SSH access, if needed |

For HTTPS:

```hcl
resource "google_compute_firewall" "allow_https" {
  name    = "allow-https"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
}
```

![GCP firewall rules showing inbound TCP 80 and 443 allowed for the dashboard VM](../assets/41_gcp_firewall_http_https.png)

---

## VM Metadata for HTTPS

Terraform passes the hostname and email into the VM:

```hcl
metadata = {
  dashboard-hostname = local.dashboard_fqdn
  letsencrypt-email  = var.letsencrypt_email
}
```

The startup script reads these values from the GCP metadata service.

If these values are missing, the dashboard remains HTTP-only.

![GCP VM custom metadata showing dashboard hostname and letsencrypt email](../assets/42_vm_https_metadata.png)

---

## Certbot and Certificate Storage

Certbot runs on the VM from an isolated Python virtual environment at `/opt/certbot-venv`.

The Certbot binary is `/opt/certbot-venv/bin/certbot`.

Certificate files are stored under `/etc/letsencrypt/live/dashboard.kirkdevsecops.com/`.

Important files:

| File | Purpose |
| --- | --- |
| `fullchain.pem` | Public certificate chain used by Nginx |
| `privkey.pem` | Private key used by Nginx |

Do not put `privkey.pem` into Terraform variables, outputs, or state.

---

## Nginx HTTPS Behavior

The dashboard first comes up over HTTP.

The app bootstrap configures Nginx with:

```nginx
listen 80 default_server;
server_name _;
```

The HTTPS helper later changes the server name to `server_name dashboard.kirkdevsecops.com;`.

Then Certbot updates Nginx to serve HTTPS and redirect HTTP to HTTPS.

Nginx handles TLS termination. The browser connects to Nginx over HTTPS, and Nginx proxies backend API calls to the local API over HTTP: `Browser -> HTTPS -> Nginx -> HTTP localhost:8080`.

This is acceptable because the backend API traffic stays inside the VM.

---

## Protected API Access and Rate Limiting

The bootstrap configures Nginx Basic Auth for protected dashboard data:

| Public before sign-in | Protected after sign-in |
| --- | --- |
| `/healthz` | `/metadata` |
| `/api/config` | `/api/dashboard` |
| `/api/dashboard/summary` | `/api/finops` |
| `/api/finops/summary` | `/api/logs` |

The public summary endpoints allow the top dashboard cards to render before sign-in. DevSecOps and FinOps use separate Basic Auth credentials so a DevSecOps login can unlock VM health, logs, and estimated VM cost without also unlocking FinOps cost-optimization details.

| Protected route | Credential pair |
| --- | --- |
| `/api/dashboard`, `/api/logs`, `/metadata` | DevSecOps username/password |
| `/api/finops` | FinOps username/password |

For production Terraform deployments, passwords should live in GCP Secret Manager. Terraform passes only Secret Manager secret IDs to VM metadata:

| Metadata key | Purpose |
| --- | --- |
| `dashboard-dev-auth-user-secret` | Secret Manager secret ID/resource path for the DevSecOps username |
| `dashboard-dev-auth-password-secret` | Secret Manager secret ID/resource path for the DevSecOps password |
| `dashboard-finops-auth-user-secret` | Secret Manager secret ID/resource path for the FinOps username |
| `dashboard-finops-auth-password-secret` | Secret Manager secret ID/resource path for the FinOps password |

> [!IMPORTANT]
> If these metadata keys are missing, the VM bootstrap exits before the dashboard Nginx site is configured. A failed VM can appear to be running but still show the default **Welcome to nginx** page.

The VM service account needs `roles/secretmanager.secretAccessor` on those four secrets. Terraform grants that access to the `vm-dashboard` service account for the secret IDs below. The bootstrap fetches the secret values at runtime and writes only local hashed credential files for Nginx.

Secret Manager is not queried on every browser request. It is read during VM bootstrap, then Nginx authenticates requests against `/etc/nginx/.vm-dashboard-dev.htpasswd` and `/etc/nginx/.vm-dashboard-finops.htpasswd`.

By default, Terraform expects these manually managed secret IDs:

| Terraform variable | Default secret ID |
| --- | --- |
| `dashboard_dev_auth_user_secret_id` | `vm-dashboard-dev-username` |
| `dashboard_dev_auth_password_secret_id` | `vm-dashboard-dev-password` |
| `dashboard_finops_auth_user_secret_id` | `vm-dashboard-finops-username` |
| `dashboard_finops_auth_password_secret_id` | `vm-dashboard-finops-password` |

![Secret Manager showing manually managed dashboard authentication secrets](../assets/52_secret_manager_auth_secrets.png)

Create the secrets outside Terraform. Terraform grants the dashboard VM service account access during `terraform apply`.

```bash
PROJECT_ID="$(gcloud config get-value project)"
SA_EMAIL="vm-dashboard@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable secretmanager.googleapis.com pubsub.googleapis.com

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
```

Add secret versions:

```bash
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

### External Secret Rotation Alert Topic

The Secret Manager notification topic should be managed outside Terraform, alongside the manually managed Secret Manager secrets. This keeps event notifications and password rotation reminders intact if the dashboard infrastructure is destroyed.

Create or reuse the topic and grant the Secret Manager service agent publisher access:

```bash
PROJECT_ID="$(gcloud config get-value project)"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")"
SECRET_MANAGER_SERVICE_AGENT="service-${PROJECT_NUMBER}@gcp-sa-secretmanager.iam.gserviceaccount.com"

gcloud services enable pubsub.googleapis.com secretmanager.googleapis.com

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
```

Attach all four auth secrets to the topic. Configure a 90-day rotation schedule only on the password secrets:

```bash
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

`7776000s` is 90 days.

The topic ID is `vm-dashboard-secret-events`. Secret Manager uses the full topic resource path: `projects/${PROJECT_ID}/topics/vm-dashboard-secret-events`.

> [!IMPORTANT]
> The dashboard VM service account receives `roles/secretmanager.secretAccessor` on the secrets. The Secret Manager service agent receives `roles/pubsub.publisher` on the Pub/Sub topic so Secret Manager can publish `SECRET_*` events.
> The Secret Manager service agent does not need permission to read secret values.

![Pub/Sub topic used by Secret Manager for dashboard auth secret events](../assets/53_pubsub_secret_events_topic.png)

![Secret Manager password rotation configuration for dashboard auth password](../assets/54_secret_manager_password_rotation_settings.png)

Nginx also applies request rate limits:

| Zone | Purpose |
| --- | --- |
| `vm_dashboard_public` | Higher limit for public summary and config endpoints |
| `vm_dashboard_protected` | Lower limit for authenticated detail endpoints |

Rate-limited requests return HTTP `429 Too Many Requests`.

The frontend header sign-in menu sends the user-entered credentials as a Basic Auth header. DevSecOps and FinOps sessions are stored separately in browser `sessionStorage` for the current browser session. The account menu can sign out of the current dashboard only or sign out everywhere. Credentials are not embedded in the React build or Terraform state.

---

## HTTP-Only Behavior

If the VM is deployed without Route 53, hostname metadata, or Certbot, the dashboard still works over HTTP at `http://<VM_EXTERNAL_IP>`.

This is the expected behavior for ClickOps/manual VM deployments.

HTTPS failure does not make the dashboard use mock data. Mock or fallback data is controlled by app/API access to GCP services, IAM roles, OAuth scopes, and BigQuery billing export.

---

## Apply

Initialize providers:

```bash
terraform init
```

Validate:

```bash
terraform validate
```

Plan:

```bash
terraform plan
```

Apply:

```bash
terraform apply
```

Terraform defaults to the standard DevSecOps and FinOps Secret Manager IDs. Override them only if you intentionally use different secret names:

```bash
terraform apply \
  -var="dashboard_dev_auth_user_secret_id=vm-dashboard-dev-username" \
  -var="dashboard_dev_auth_password_secret_id=vm-dashboard-dev-password" \
  -var="dashboard_finops_auth_user_secret_id=vm-dashboard-finops-username" \
  -var="dashboard_finops_auth_password_secret_id=vm-dashboard-finops-password"
```

If using a named AWS profile:

```bash
terraform apply -var="aws_profile=your-profile-name"
```

---

## Outputs

Useful outputs include:

| Output | Meaning |
| --- | --- |
| `vm_external_ip` | GCP static external IP |
| `dashboard_hostname` | DNS name used for HTTPS |
| `dashboard_url` | HTTPS URL |
| `ssh_command` | GCP SSH helper command |

---

## Destroy and Recreate Behavior

On destroy:

- the VM is destroyed
- certificate files on the VM are deleted with the VM
- the Route 53 record is removed if Terraform created it
- the static IP is released unless preserved outside this stack

On a fresh apply:

- Terraform creates infrastructure again
- DNS is recreated or updated
- the new VM starts over HTTP
- Certbot requests a new certificate after DNS points to the VM

Avoid repeated destroy/apply loops in a short time window because Let’s Encrypt has rate limits.

---

## Troubleshooting

Check DNS:

```bash
dig +short dashboard.kirkdevsecops.com
```

Check HTTP:

```bash
curl -I http://dashboard.kirkdevsecops.com
```

Check HTTPS:

```bash
curl -I https://dashboard.kirkdevsecops.com
```

Check the HTTPS setup service:

```bash
sudo systemctl status vm-dashboard-https.service
sudo journalctl -u vm-dashboard-https.service --no-pager
```

Check Certbot:

```bash
sudo /opt/certbot-venv/bin/certbot certificates
```

![Certbot certificates output showing dashboard certificate paths and expiry](../assets/43_certbot_certificate_output.png)

Test renewal:

```bash
sudo /opt/certbot-venv/bin/certbot renew --dry-run
```

Check Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
```

---

## Common Issues

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| HTTP works but HTTPS hangs | Port `443` blocked or Nginx not listening on HTTPS | Check firewall and Certbot logs |
| Certbot says DNS is wrong | Route 53 record has not propagated or points to old IP | Check `dig +short` and Terraform output |
| HTTPS by IP fails | Certificate is for hostname, not IP | Use `https://dashboard.kirkdevsecops.com` |
| Certbot Python/OpenSSL error | OS Certbot package dependency mismatch | Use `/opt/certbot-venv/bin/certbot` |
| Dashboard shows fallback data | IAM/API/BigQuery prerequisites missing | Review [GCP prerequisites](../PREREQUISITES.md) |

---

## Best Practice

Use Terraform for infrastructure and DNS.

Use Certbot on the VM for certificate issuance and renewal.

Do not store certificate private keys in Terraform state.
