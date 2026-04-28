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

## Configuration Boundary (Important)

```bash
# ---------------------------------------------------------------------------------------------
# !!! END OF CONFIGURATION - DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING !!!
# ---------------------------------------------------------------------------------------------
```

> [!IMPORTANT]
> Treat this marker as a **hard boundary**.
> Everything above it is safe to modify. Everything below it is part of the deployment logic.

---

## Other Configurable Values

Immediately below the configuration boundary, you will see:

```bash
GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json"
```

* **`GITHUB_QUOTES_URL`** – Must point to a valid `quotes.json` file accessible over HTTP.

> [!NOTE]
> The wrapper script (`infra/startup/gcp_startup.sh`) hardcodes the repository clone URL. Change that wrapper if you deploy from a fork.

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
2. Commit and push the changes to the Git repository cloned by `infra/startup/gcp_startup.sh`.
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
export DASHBOARD_APP_NAME="Stock Dashboard"
export DASHBOARD_TAGLINE="Real-time price monitoring"
export DASHBOARD_USER="Carlton Banks"
export DASHBOARD_NAME="FinOps Insights"
```

These values are returned by the Python API in the `/api/dashboard` response and consumed by the frontend at runtime.

> [!NOTE]
> `VITE_GITHUB_URL` and `VITE_LINKEDIN_URL` are build-time React variables. Set them before `npm run build`; changing them after the site is built will not update the deployed frontend.

---
