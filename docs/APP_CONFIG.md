# Dashboard Customization – `app_bootstrap.sh`

The dashboard’s appearance and behavior can be customized by editing the variables at the top of `scripts/bootstrap/app_bootstrap.sh`. No other changes are required for standard customization.

---

## Editable Variables

Open `app_bootstrap.sh` and locate the **“Dashboard Customization”** block:

```bash
# -------------------------------
# Dashboard Customization
# -------------------------------
# Edit these values to customize your dashboard

# App name shown in the header (top left)
DASHBOARD_APP_NAME="GCP Deployment"

# Tagline shown below the app name
DASHBOARD_TAGLINE="Infrastructure health and activity"

# User name shown in the sidebar
DASHBOARD_USER="Kirk Alton"

# Dashboard title shown in the sidebar
DASHBOARD_NAME="DevSecOps Dashboard"
```

Update these values as needed:

| Variable             | Purpose                                    | Example                        |
| -------------------- | ------------------------------------------ | ------------------------------ |
| `DASHBOARD_APP_NAME` | Displayed in the top-left corner of the UI | `My Dashboard`                 |
| `DASHBOARD_TAGLINE`  | Subtitle beneath the app name              | `Live infrastructure insights` |
| `DASHBOARD_USER`     | Shown in the sidebar (user attribution)    | `Jane Doe`                     |
| `DASHBOARD_NAME`     | Title of the dashboard (sidebar heading)   | `Ops Center`                   |

> [!TIP]
> These values are injected into the frontend via the API (`/api/dashboard`), so changes will propagate automatically after redeploy.

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
# Repo to pull the dashboard code from (can be changed to your fork)
REPO_URL="https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git"

# URL to fetch quotes from (must be a valid quotes.json file inside your repo)
GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json"
```

* **`REPO_URL`** – Set this to your fork if you are maintaining a custom version of the dashboard.
* **`GITHUB_QUOTES_URL`** – Must point to a valid `quotes.json` file accessible over HTTP.

> [!NOTE]
> If `GITHUB_QUOTES_URL` is invalid or unreachable, the quotes feature will silently fall back or fail to refresh.

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
2. Commit and push the changes to your Git repository (the same one referenced by `REPO_URL`).
3. The VM’s auto-deploy cron job will detect changes within ~15 minutes and rebuild the dashboard automatically.

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

The React frontend reads these same values from environment variables. If running the Flask API outside of the startup script, you can define them manually:

```bash
export DASHBOARD_APP_NAME="Stock Dashboard"
export DASHBOARD_TAGLINE="Real-time price monitoring"
export DASHBOARD_USER="Carlton Banks"
export DASHBOARD_NAME="FinOps Insights"
```

These values are injected by the Flask API into the `/api/dashboard` endpoint and consumed by the frontend at runtime.

> [!NOTE]
> Environment variables override defaults at runtime but do not persist across reboots unless explicitly configured.

---
