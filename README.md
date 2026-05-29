# VM Dashboard Collection

This repository contains GCP VM dashboards for different lab sizes: a one-file starter, a basic React dashboard, and a full advanced DevSecOps/FinOps dashboard.

## Dashboards

| Dashboard | Best for | Deployment shape | Start here |
| --- | --- | --- | --- |
| **Dashboard Starter** | Fastest ClickOps VM proof-of-life page | Single startup script, nginx, port 80 | [dashboard-starter/README.md](dashboard-starter/README.md) |
| **Basic VM Dashboard** | Simple VM health dashboard with a richer frontend | Static React build plus local dashboard API | [dashboard-basic/README.md](dashboard-basic/README.md) |
| **Advanced DevSecOps VM Dashboard** | Full DevSecOps + FinOps labs, protected views, logs, snapshots, Secret Manager credentials, and optional Terraform HTTPS | Full app, infra, and Terraform workflow | [dashboard-advanced/README.md](dashboard-advanced/README.md) |

## Starter Metadata

`dashboard-starter` only accepts one optional student-provided metadata key:

| Key | Used for |
| --- | --- |
| `student_name` | Sidebar/student banner |

All other values shown by the starter dashboard are read automatically from the VM, the GCE metadata server, or local Linux system files.

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

Use **Dashboard Starter** when you want the simplest possible VM dashboard: paste one startup script, optionally set `student_name`, allow HTTP, and open the VM external IP.

Use **Basic VM Dashboard** when you want a richer dashboard experience while still avoiding Secret Manager, FinOps, logs, and custom service account requirements.

Use **Advanced DevSecOps VM Dashboard** when you want the full protected dashboard experience, FinOps data, logs, Text Mode log workflows, Secret Manager backed Basic Auth, and Terraform HTTPS deployment.
