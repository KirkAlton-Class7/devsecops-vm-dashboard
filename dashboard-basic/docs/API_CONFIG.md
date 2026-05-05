# API Configuration

The Basic VM Dashboard API lives at `dashboard-basic/scripts/dashboard_api.py`.

It uses:

- `/proc/stat` for CPU
- `/proc/meminfo` for memory
- `os.statvfs("/")` for disk
- GCE metadata server for project, instance, zone, network, and external IP when available
- `systemctl is-active` for local service health

It does not call Cloud Monitoring, BigQuery, Recommender, Billing, Secret Manager, or Cloud Logging.

## Endpoints

| Endpoint | Description |
| --- | --- |
| `/healthz` | Returns `ok` |
| `/metadata` | Returns the basic dashboard JSON payload |
| `/api/dashboard` | Returns the basic dashboard JSON payload |
| `/api/dashboard/summary` | Returns the same basic payload for compatibility |

Unsupported endpoints return `404`.

## Payload Shape

```json
{
  "summaryCards": [],
  "identity": {},
  "network": {},
  "location": {},
  "systemResources": {},
  "monitoringEndpoints": [],
  "services": [],
  "meta": {}
}
```
