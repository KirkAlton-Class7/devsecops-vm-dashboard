# Theo University VM Dashboard Starter

`dashboard-starter` is the smallest VM dashboard in this repo. It is a single GCE startup script that installs nginx, writes a static dashboard, and exposes lightweight health and metadata endpoints on port 80.

It does not require Terraform, a git clone, custom IAM roles, Secret Manager, Cloud Billing access, HTTPS certificates, or a frontend build step.

## File

- `infra/startup/gcp_startup.sh` - drop-in GCE startup script

## Metadata

The starter has one optional student-provided metadata key:

| Key | Example | Used for |
| --- | --- | --- |
| `student_name` | `Darth Malgus Jr` | Sidebar/student banner |

Everything else is discovered automatically from the VM, the GCE metadata server, or local Linux system files.

## Deploy

Use `infra/startup/gcp_startup.sh` as the VM startup script.

In the GCP console:

1. Create or edit a Compute Engine VM.
2. Add the startup script from `infra/startup/gcp_startup.sh`.
3. Optionally add metadata key `student_name`.
4. Make sure HTTP traffic is allowed for the VM.
5. Open `http://EXTERNAL_IP/`.

## Endpoints

- `/` - VM dashboard
- `/healthz` - plain text health check
- `/metadata` - JSON metadata and system snapshot
- `/api/dashboard` - same JSON payload for dashboard-shaped clients

## What It Installs

- `nginx`
- `curl`
- `jq`
- `ca-certificates`

## Notes

This starter intentionally stays basic: HTTP only on port 80, no port 8080 service, no HTTPS certificate, no Python API, no Node/Vite build, and no extra GCP permissions.
