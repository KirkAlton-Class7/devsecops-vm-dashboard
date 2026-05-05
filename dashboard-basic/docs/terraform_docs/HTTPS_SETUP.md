# Terraform HTTPS Setup

Terraform can deploy Basic VM Dashboard with Certbot HTTPS metadata. DNS is managed outside this basic stack.

## Basic HTTP Deployment

```bash
cd terraform
terraform init
terraform apply \
  -var="project_id=YOUR_GCP_PROJECT_ID" \
  -var="root_domain=example.com"
```

Open the `dashboard_http_url` output.

## HTTPS Deployment

Point a hostname to the VM static IP. Use the `vm_external_ip` output to create your DNS `A` record with your DNS provider.

```bash
terraform apply \
  -var="project_id=YOUR_GCP_PROJECT_ID" \
  -var="root_domain=example.com" \
  -var="dashboard_subdomain=basic-dashboard" \
  -var="letsencrypt_email=you@example.com"
```

The startup wrapper waits until HTTP is online, then runs Certbot on the VM.

## Staging Mode

Use staging mode while testing repeated rebuilds:

```bash
terraform apply \
  -var="project_id=YOUR_GCP_PROJECT_ID" \
  -var="letsencrypt_email=you@example.com" \
  -var="letsencrypt_staging_enabled=true"
```

> [!IMPORTANT]
> Let’s Encrypt staging certificates are not browser-trusted. Use staging to validate DNS, Nginx, firewall, and Certbot behavior without consuming production rate limits.

## Rate Limit Reminder

Let’s Encrypt production limits include:

| Limit | Scope |
| --- | --- |
| `5` duplicate certificates | Same exact set of domains per rolling `7` days |
| `50` certificates | Per registered domain per rolling `7` days |
| `5` failed validations | Per account, hostname, and hour |

References:

- [Let’s Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Certbot User Guide](https://certbot.eff.org/docs/using.html)
- [Let’s Encrypt Staging Environment](https://letsencrypt.org/docs/staging-environment/)
