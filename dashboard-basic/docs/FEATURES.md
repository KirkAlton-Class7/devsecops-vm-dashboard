# Features

Basic VM Dashboard is a single-mode dashboard for VM smoke testing.

## Included

- CPU, memory, disk, and uptime cards
- Instance identity
- Network details
- Region, zone, and hostname
- Local system resources
- Nginx/API/static build service status
- Local health endpoints
- Featured quote card
- Mock fallback data for local development

## Excluded by Design

- FinOps mode
- Logs widget and logs API
- Load trend widget
- Text mode
- Cloud Monitoring metrics
- BigQuery billing export
- Recommender and rightsizing data
- Secret Manager-backed Basic Auth

This keeps the deployment small and suitable for basic VM testing.
