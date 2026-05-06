# App Configuration

The main bootstrap file is `dashboard-basic/scripts/bootstrap/app_bootstrap.sh`.

Editable values:

```bash
DASHBOARD_APP_NAME="Basic VM Dashboard"
DASHBOARD_TAGLINE="VM health and basicmetadata"
DASHBOARD_USER="Kirk Alton"
DASHBOARD_NAME="Basic VM Dashboard"
```

The deployment installs Nginx, Python, Node.js, clones/builds the React app, starts `dashboard-api.service`, and serves static files from:

```text
/var/www/basic-vm-dashboard
```

## Configuration Boundary

```bash
# =================================
# END OF CONFIGURATION
# ---------------------------------
# Modify sections below with caution.
# ==================================
```

> [!IMPORTANT]
> Values above the boundary are safe customization. Logic below the boundary handles package installation, build/deploy, services, and Nginx.

## Shared Asset Source

The basic deployment uses the root shared asset folder when it exists:

```text
shared/assets/quotes/quotes.json
shared/assets/images/image_gallery/gallery-manifest.json
shared/assets/images/image_gallery/*.webp
```

At runtime those files are staged into:

```text
/var/www/basic-vm-dashboard/data/quotes.json
/var/www/basic-vm-dashboard/data/gallery-manifest.json
/var/www/basic-vm-dashboard/data/images/
```

During local Vite development, the frontend can also fall back to the same shared gallery manifest and image files directly from the repository. This prevents the gallery from showing an empty state when Nginx is not serving `/data/gallery-manifest.json`.
