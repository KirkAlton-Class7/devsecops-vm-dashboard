# VM Dashboard Collection

This repository contains two related GCP VM dashboards that share static quote and image assets while keeping deployment logic separate.

## Dashboards

| Dashboard | Best for | Start here |
| --- | --- | --- |
| **Advanced DevSecOps VM Dashboard** | Full DevSecOps + FinOps labs with protected data, logs, snapshots, Secret Manager credentials, and optional Terraform HTTPS | [dashboard-advanced/README.md](dashboard-advanced/README.md) |
| **Basic VM Dashboard** | Fast VM smoke tests and simple ClickOps deployments with basic VM health only | [dashboard-basic/README.md](dashboard-basic/README.md) |

## Shared Assets

Both dashboards can use the shared quote and image gallery assets:

```text
shared/assets/quotes/quotes.json
shared/assets/images/image_gallery/gallery-manifest.json
shared/assets/images/image_gallery/*.webp
```

During VM bootstrap, each dashboard stages those files into its own `/var/www/.../data` directory. During local Vite development, the gallery also has a build-time fallback to the shared manifest/images so the Scenes from Around the World card still renders when `/data/gallery-manifest.json` is not being served by Nginx.

## Repository Layout

```text
dashboard-advanced/   Full DevSecOps + FinOps dashboard, docs, scripts, infra, Terraform
dashboard-basic/      Basic VM Dashboard, docs, scripts, infra, Terraform
shared/               Shared quotes and image gallery assets
```

## Quick Links

- [Advanced dashboard quickstart](dashboard-advanced/docs/QUICKSTART.md)
- [Advanced prerequisites](dashboard-advanced/docs/PREREQUISITES.md)
- [Advanced frontend README](dashboard-advanced/dashboard/README.md)
- [Basic dashboard quickstart](dashboard-basic/docs/QUICKSTART.md)
- [Basic frontend README](dashboard-basic/dashboard/README.md)

## Choosing a Dashboard

Use **Basic VM Dashboard** when you want a quick deployment target with minimal GCP permissions and no Secret Manager, FinOps, logs, or custom service account requirement.

Use **Advanced DevSecOps VM Dashboard** when you want the full protected dashboard experience, FinOps data, logs, Text Mode log workflows, Secret Manager backed Basic Auth, and Terraform HTTPS deployment.
