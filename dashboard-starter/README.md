# VM Dashboard - Starter

The starter dashboard is the simplest VM dashboard in this repo. It is a single GCE startup script that installs nginx, writes a static dashboard, and exposes basic health and metadata endpoints on port 80.

It does not require Terraform, a git clone, custom IAM roles, Secret Manager, Cloud Billing access, HTTPS certificates, or a frontend build step.

## File

- `infra/startup/gcp_startup.sh` - drop-in GCE startup script

## Metadata

The starter script supports three optional metadata keys:

| Key | Example | Used for |
| --- | --- | --- |
| `student_name` | `Anonymous Padawan` | Student name header text |
| `app_name` | `VM Dashboard` | Application name header text |
| `tagline` | `GCP deployment for Theo University` | Tagline header text |



## Deploy

Use `infra/startup/gcp_startup.sh` as the VM startup script.

In the GCP console:

1. Create or edit a Compute Engine VM.
2. Add the startup script from `infra/startup/gcp_startup.sh`.
3. Optional: Add metadata keys `student_name`, `app_name`, `tagline`
4. Make sure HTTP traffic is allowed for the VM.
5. Open `http://EXTERNAL_IP/`to view the dashboard.

## Endpoints

- `/healthz` - plain text health check
- `/metadata` - JSON metadata and system snapshot
- `/api/dashboard` - same JSON payload for dashboard-shaped clients