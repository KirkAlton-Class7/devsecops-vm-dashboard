# VM Dashboard Collection

This repository contains GCP VM dashboards for different scenarios: a one-file starter (HTTP), a basic React dashboard (HTTP), and an advanced production level dashboard (HTTPS).

## Dashboards

| Dashboard | Best for | Deployment shape | Start here |
| --- | --- | --- | --- |
| **Dashboard Starter** | Fast ClickOps VM for sandbox, labs, and proof-of-life | Single startup script, nginx, port 80 | [dashboard-starter/README.md](dashboard-starter/README.md) |
| **Basic VM Dashboard** | Simple VM health dashboard with a richer frontend | Static React build plus local dashboard API | [dashboard-basic/README.md](dashboard-basic/README.md) |
| **Advanced DevSecOps VM Dashboard** | Advanced dashboard with detailed DevSecOps and FinOps data | Protected views, logs, Secret Manager credentials, HTTPS, and Terraform deployment | [dashboard-advanced/README.md](dashboard-advanced/README.md) |


## Repository Layout

```text
dashboard-starter/   One-file nginx startup-script dashboard
dashboard-basic/     Basic VM Dashboard, docs, scripts, infra, Terraform
dashboard-advanced/  Full DevSecOps + FinOps dashboard, docs, scripts, infra, Terraform
shared/              Shared quotes and image gallery assets for Basic/Advanced dashboards
```

## Shared Assets

The Basic and Advanced dashboards can use the shared quote and image gallery assets:

```text
shared/assets/quotes/quotes.json
shared/assets/images/image_gallery/gallery-manifest.json
shared/assets/images/image_gallery/*.webp
```

The Starter dashboard is self-contained and does not depend on shared assets.

## Quick Links

- [Starter dashboard README](dashboard-starter/README.md)
- [Basic dashboard quickstart](dashboard-basic/docs/QUICKSTART.md)
- [Basic frontend README](dashboard-basic/dashboard/README.md)
- [Advanced dashboard quickstart](dashboard-advanced/docs/QUICKSTART.md)
- [Advanced prerequisites](dashboard-advanced/docs/PREREQUISITES.md)
- [Advanced frontend README](dashboard-advanced/dashboard/README.md)

## Choosing a Dashboard

Use **Dashboard Starter** when you want a quick, simple deployment for labs and sandboxing.

Use **Basic VM Dashboard** when you want a richer dashboard experience without the complexities of Secret Manager, FinOps, logs, and additional service account requirements.

Use **Advanced DevSecOps VM Dashboard** when you want the full production grade dashboard experience with Secret Manager, FinOps data, logs, HTTPS and Terraform automation.
