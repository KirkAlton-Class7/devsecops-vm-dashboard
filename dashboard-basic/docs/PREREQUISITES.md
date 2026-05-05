# Prerequisites

Basic VM Dashboard is designed to run with minimal GCP setup.

## Required

- GCP project
- Compute Engine API
- VM external IP
- Firewall rule for TCP `80`

Enable the only required API:

```bash
gcloud services enable compute.googleapis.com
```

## Optional

- TCP `443` firewall access for HTTPS
- DNS record pointing a hostname to the VM external IP
- Let’s Encrypt email metadata for Certbot
- DNS access if you want to point a hostname at the VM external IP

## Not Required

The basic dashboard does **not** require:

- Custom VM service account
- Secret Manager
- Pub/Sub
- BigQuery billing export
- Cloud Monitoring API
- Cloud Logging API
- Recommender API
- Billing Budgets API
- Dashboard Basic Auth credentials

Subnet and VPC names are best-effort metadata values. If they are unavailable, the dashboard shows `unknown`.
