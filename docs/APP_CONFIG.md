# Application Bootstrap Configuration

## Dashboard Customization – `app_bootstrap.sh`

The dashboard’s appearance and behavior can be customized by editing the variables at the top of `scripts/bootstrap/app_bootstrap.sh`. No other changes are required for standard customization.

---

## Editable Variables

Open `app_bootstrap.sh` and locate the **“Dashboard Customization”** block:

```bash
# -------------------------------
# Dashboard Customization
# -------------------------------
DASHBOARD_APP_NAME="GCP Deployment"
DASHBOARD_TAGLINE="Infrastructure health and activity"
DASHBOARD_USER="Kirk Alton"
DASHBOARD_NAME="DevSecOps Dashboard"

# ---------------------------------
# Env Variables for React build
# ---------------------------------
export VITE_GITHUB_URL="https://github.com/KirkAlton-Class7"
export VITE_LINKEDIN_URL="https://www.linkedin.com/in/kirkcochranjr/"
```

Update these values as needed:

| Variable             | Purpose                                    | Example                        |
| -------------------- | ------------------------------------------ | ------------------------------ |
| `DASHBOARD_APP_NAME` | Displayed in the top-left corner of the UI | `My Dashboard`                 |
| `DASHBOARD_TAGLINE`  | Subtitle beneath the app name              | `Live infrastructure insights` |
| `DASHBOARD_USER`     | Shown in the sidebar (user attribution)    | `Jane Doe`                     |
| `DASHBOARD_NAME`     | Title of the dashboard (sidebar heading)   | `Ops Center`                   |
| `VITE_GITHUB_URL`    | GitHub link compiled into the React build  | `https://github.com/example`   |
| `VITE_LINKEDIN_URL`  | LinkedIn link compiled into the React build | `https://www.linkedin.com/in/example/` |

> [!TIP]
> `DASHBOARD_*` values are exported for the API service and returned through `/api/dashboard`. `VITE_*` values are read by Vite during `npm run build`, so they require a frontend rebuild.

---

## Configuration Boundary

```bash
# ==================================
# END OF CONFIGURATION
# ---------------------------------
# Modify sections below with caution.
# ==================================
```

> [!IMPORTANT]
> Treat this as a **hard boundary**:
>
> * Above → safe for customizing dashboard branding and React build links
> * Below → deployment automation logic (package installation, repository sync, file paths, services, Nginx, cron jobs, and build/deploy steps)
---

## GitHub Content Source

```bash
GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json"
```

* **`GITHUB_QUOTES_URL`** – Raw GitHub URL used to download the dashboard quote dataset. It must point to a valid, publicly accessible `quotes.json` file.

> [!NOTE]
> This value only controls where quote data is downloaded from.
> The repository clone URL is configured separately in the VM startup wrapper (`infra/startup/gcp_startup.sh`). If you deploy from a fork, update the wrapper script as well.

---

## System and Path Configuration (Reference)

The following values define how the application is deployed on the VM:

```bash
# -------------------------------
# System User
# -------------------------------
APP_USER="appuser"

# -------------------------------
# Application Paths
# -------------------------------
APP_NAME="vm-dashboard"
APP_DIR="/var/www/${APP_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
DATA_DIR="${APP_DIR}/data"
```

> [!CAUTION]
> These values affect system-level behavior (NGINX, file paths, permissions).
> Modify only if you understand the implications on your deployment environment.

---

## Applying Changes

1. Edit `app_bootstrap.sh` in your local repository.
2. Commit and push the changes to the Git repository cloned by the VM startup wrapper (`infra/startup/gcp_startup.sh`).
3. The VM’s auto-deploy cron job runs `/opt/dashboard-deploy.sh` every 15 minutes and rebuilds when the local checkout differs from `origin/main`.

To trigger an immediate update:

```bash
sudo /opt/dashboard-deploy.sh
```

> [!TIP]
> If changes do not appear, check:
>
> * `/var/log/bootstrap.log`
> * `/var/log/startup-script.log`

---

## Environment Variables (Optional)

If running the Python API outside of the startup script, define the dashboard branding variables before starting it:

```bash
export DASHBOARD_APP_NAME="GCP Deployment"
export DASHBOARD_TAGLINE="Infrastructure health and activity"
export DASHBOARD_USER="Kirk Alton"
export DASHBOARD_NAME="DevSecOps Dashboard"
```

These values are returned by the Python API in the `/api/dashboard` response and consumed by the frontend at runtime.

> [!NOTE]
> `VITE_GITHUB_URL` and `VITE_LINKEDIN_URL` are build-time React variables. Set them before `npm run build`; changing them after the site is built will not update the deployed frontend.

---
