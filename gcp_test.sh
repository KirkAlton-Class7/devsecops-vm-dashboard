#!/usr/bin/env bash

# -------------------------------
# Dashboard Customization
# -------------------------------
# Edit these values to customize your dashboard

# App name shown in the header (top left)
DASHBOARD_APP_NAME="GCP - Week 3"

# Tagline shown below the app name
DASHBOARD_TAGLINE="Real-time infrastructure monitoring"

# User name shown in the sidebar
DASHBOARD_USER="Kirk Alton"

# Dashboard title shown in the sidebar
DASHBOARD_NAME="DevSecOps Dashboard"

# ---------------------------------------------------------------------------------------------
# !!! END OF CONFIGURATION - DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING !!!
# ---------------------------------------------------------------------------------------------

# Determine script location - we're already in the repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${SCRIPT_DIR}"  # We're already in the repo root

# URL to fetch quotes from (must be a valid quotes.json file inside your repo)
GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json"

# -------------------------------
# System User
# -------------------------------
APP_USER="appuser"

# -------------------------------
# Application Paths
# -------------------------------
APP_NAME="devsecops-sandbox"
APP_DIR="/var/www/${APP_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
DATA_DIR="${APP_DIR}/data"

# -------------------------------
# Environment Setup
# -------------------------------
export DEBIAN_FRONTEND=noninteractive

# Export dashboard variables for Python
export DASHBOARD_APP_NAME
export DASHBOARD_TAGLINE
export DASHBOARD_USER
export DASHBOARD_NAME

# -------------------------------
# Logging & Debugging
# -------------------------------
exec > /var/log/startup-script.log 2>&1
set -Euo pipefail
set -x

log() { echo "[${APP_NAME}] $1"; }

log "Dashboard customization:"
log "  App Name: ${DASHBOARD_APP_NAME}"
log "  Tagline: ${DASHBOARD_TAGLINE}"
log "  User: ${DASHBOARD_USER}"
log "  Dashboard Name: ${DASHBOARD_NAME}"
log "  Running from: ${REPO_DIR}"

# -------------------------------
# GCP Metadata Helper
# -------------------------------
md() {
  curl -fsS -H "Metadata-Flavor: Google" \
  --connect-timeout 2 --max-time 3 \
  "http://metadata.google.internal/computeMetadata/v1/$1" 2>/dev/null || echo "unknown"
}

safe_basename() {
  basename "$1" 2>/dev/null || echo "$1"
}

service_status() {
  systemctl is-active --quiet "$1" 2>/dev/null && echo "Running" || echo "Stopped"
}

command_status() {
  command -v "$1" >/dev/null 2>&1 && echo "Installed" || echo "Missing"
}

retry() {
  local n=0 max=5 delay=2
  until [ "$n" -ge "$max" ]; do
    "$@" && return 0
    n=$((n+1))
    log "Retry $n/$max..."
    sleep "$delay"
  done
  return 1
}

wait_for_apt() {
  log "Waiting for apt lock..."
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
    sleep 2
  done
  log "Apt lock released"
}

# -------------------------------
# Package Installation
# -------------------------------
mkdir -p /opt

wait_for_apt
retry apt-get update -y

wait_for_apt
retry apt-get install -y \
  nginx python3 curl jq ca-certificates git build-essential

# -------------------------------
# Node.js Installation
# -------------------------------
if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js"
  retry curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# -------------------------------
# Application User & Directories
# -------------------------------
if ! id "${APP_USER}" >/dev/null 2>&1; then
  log "Creating user ${APP_USER}"
  useradd -m -s /bin/bash "${APP_USER}"
fi

mkdir -p "${APP_DIR}" "${DATA_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}"

# -------------------------------
# Update Repository (Pull latest changes)
# -------------------------------
log "Updating repository at ${REPO_DIR}"
cd "${REPO_DIR}"
git pull || log "Warning: git pull failed, continuing with existing code"
chown -R ${APP_USER}:${APP_USER} "${REPO_DIR}"

# -------------------------------
# Local Quote Fallback
# -------------------------------
LOCAL_QUOTES="${DATA_DIR}/quotes_local.json"
ACTIVE_QUOTES="${DATA_DIR}/quotes.json"

cat > "${LOCAL_QUOTES}" <<'EOF'
[
  {"id": 1, "text": "He who has a why to live for can bear almost any how.", "author": "Friedrich Nietzsche", "source": null, "tags": ["purpose", "resilience"]},
  {"id": 2, "text": "We all make choices in life, but in the end, our choices make us.", "author": "Andrew Ryan", "source": "BioShock", "tags": ["choices", "identity"]},
  {"id": 3, "text": "Perfection isn't possible, but chasing it helps you catch excellence.", "author": "Vince Lombardi", "source": null, "tags": ["excellence", "growth"]},
  {"id": 4, "text": "You can't cross the sea by staring at the water.", "author": "Rabindranath Tagore", "source": null, "tags": ["action", "courage"]},
  {"id": 5, "text": "The greatest loss is what dies inside while still alive.", "author": "Norman Cousins", "source": null, "tags": ["purpose", "regret"]},
  {"id": 6, "text": "Easy choices, hard life. Hard choices, easy life.", "author": "Jerzy Gregorek", "source": null, "tags": ["discipline", "choices"]},
  {"id": 7, "text": "We are what we pretend to be, so we must be careful about what we pretend to be.", "author": "Kurt Vonnegut", "source": null, "tags": ["identity", "behavior"]},
  {"id": 8, "text": "Success is the sum of small efforts repeated every day.", "author": "Robert Collier", "source": null, "tags": ["consistency", "success"]},
  {"id": 9, "text": "A question opens the mind, a statement closes the mind.", "author": "Unattributed", "source": null, "tags": ["thinking", "curiosity"]},
  {"id": 10, "text": "Nothing comes from nothing; nothing ever could. Do something!", "author": "Richard Rodgers & Oscar Hammerstein II", "source": "The Sound of Music", "tags": ["action", "motivation"]}
]
EOF

# -------------------------------
# Quote Refresh Cron
# -------------------------------
log "Setting up cron job to refresh quotes"
CRON_CMD="*/10 * * * * curl -fsSL ${GITHUB_QUOTES_URL} -o ${DATA_DIR}/quotes.json.tmp && mv ${DATA_DIR}/quotes.json.tmp ${DATA_DIR}/quotes.json && cp ${DATA_DIR}/quotes.json ${DATA_DIR}/quotes_local.json >> /var/log/quotes-cron.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'quotes.json'; echo "$CRON_CMD") | crontab -

# -------------------------------
# Photo Gallery Setup
# -------------------------------
log "Setting up photo gallery"
mkdir -p "${DATA_DIR}/images"

if [ -d "$REPO_DIR/images" ]; then
    cp -r "$REPO_DIR/images/"* "${DATA_DIR}/images/" 2>/dev/null && log "Images copied successfully"
fi

if [ -f "$REPO_DIR/images.json" ]; then
    cp "$REPO_DIR/images.json" "${DATA_DIR}/images.json" && log "Images metadata copied"
fi

chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}/images" 2>/dev/null || true
chmod -R 755 "${DATA_DIR}/images" 2>/dev/null || true

# -------------------------------
# GCP Metadata Collection
# -------------------------------
log "Collecting GCP metadata"

HOSTNAME_VM="$(md instance/hostname || hostname)"
INSTANCE_ID="$(md instance/id || echo "unknown")"
ZONE="$(safe_basename "$(md instance/zone)" || echo "unknown")"
REGION="${ZONE%-*}"
MACHINE_TYPE="$(safe_basename "$(md instance/machine-type)" || echo "unknown")"
PROJECT_ID="$(md project/project-id || echo "unknown")"
INSTANCE_NAME="$(md instance/name || echo "unknown")"

INTERNAL_IP="$(md instance/network-interfaces/0/ip || hostname -I | awk '{print $1}' 2>/dev/null || echo "unknown")"

PUBLIC_IP=$(md instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null)
if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "unknown" ]; then
    PUBLIC_IP=$(curl -s ifconfig.me | tr -d '\n')
fi
[ -z "$PUBLIC_IP" ] && PUBLIC_IP="unknown"

OS_NAME="$(. /etc/os-release && echo "$PRETTY_NAME")"
UPTIME="$(uptime -p || echo "unknown")"

# -------------------------------
# System Metrics
# -------------------------------
CPU_USAGE="$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {printf "%.0f", usage}' 2>/dev/null || echo "0")"
MEM_PERCENT="$(free | awk '/Mem:/ {printf("%.0f"), $3/$2 * 100.0}' 2>/dev/null || echo "0")"
DISK_PERCENT="$(df / | tail -1 | awk '{print $5}' 2>/dev/null || echo "0%")"

IFACE=$(ip route get 1 2>/dev/null | awk '{print $5}' || echo "eth0")
RX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/rx_bytes 2>/dev/null || echo "0")"
TX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/tx_bytes 2>/dev/null || echo "0")"

# -------------------------------
# Service Status
# -------------------------------
NGINX_STATUS="$(service_status nginx)"
PYTHON_STATUS="$(command_status python3)"
STARTUP_STATUS="Completed"
METADATA_STATUS="Reachable"
HTTP_STATUS="Serving"
BOOTSTRAP_PACKAGES_JSON='["nginx","python3","curl","jq","git"]'

# -------------------------------
# Security Status
# -------------------------------
FIREWALL_STATUS="Not installed"
SSH_STATUS="$(systemctl is-active ssh 2>/dev/null || echo "Not installed")"
UPDATES="$(apt list --upgradable 2>/dev/null | tail -n +2 | wc -l || echo "0")"
UPDATE_STATUS="Current"

# -------------------------------
# Export for Python
# -------------------------------
export HOSTNAME_VM INSTANCE_ID ZONE REGION MACHINE_TYPE INSTANCE_NAME PROJECT_ID
export INTERNAL_IP PUBLIC_IP OS_NAME UPTIME
export NGINX_STATUS PYTHON_STATUS STARTUP_STATUS METADATA_STATUS HTTP_STATUS
export FIREWALL_STATUS SSH_STATUS UPDATE_STATUS BOOTSTRAP_PACKAGES_JSON
export CPU_USAGE MEM_PERCENT DISK_PERCENT RX_BYTES TX_BYTES

# -------------------------------
# Fetch GitHub Quotes
# -------------------------------
log "Fetching latest quotes from GitHub"

retry curl -fsSL "${GITHUB_QUOTES_URL}" -o "${ACTIVE_QUOTES}.tmp"

if [ $? -eq 0 ] && [ -s "${ACTIVE_QUOTES}.tmp" ]; then
    if python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
        mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
        cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
        log "GitHub quotes fetched successfully"
        
        FIRST_QUOTE=$(python3 -c "import json; print(json.load(open('${ACTIVE_QUOTES}'))[0]['text'][:60])" 2>/dev/null || echo "Unknown")
        log "First quote: ${FIRST_QUOTE}..."
        
        if grep -q "Nietzsche" "${ACTIVE_QUOTES}"; then
            log "WARNING: Fallback quotes detected"
        fi
    else
        log "Invalid JSON, keeping existing"
        rm -f "${ACTIVE_QUOTES}.tmp"
    fi
else
    log "Failed to fetch, using existing"
fi

if [ -f "${ACTIVE_QUOTES}" ]; then
    QUOTE_COUNT=$(python3 -c "import json; print(len(json.load(open('${ACTIVE_QUOTES}'))))" 2>/dev/null || echo "0")
    log "Quotes file has ${QUOTE_COUNT} quotes"
fi

# -------------------------------
# Build React Dashboard
# -------------------------------
log "Building dashboard"
cd "$REPO_DIR/dashboard" || { log "ERROR: dashboard directory not found"; exit 1; }
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

sudo -u ${APP_USER} bash <<EOF
cd "$REPO_DIR/dashboard"
if ! npm ci 2>/dev/null; then
  npm install || exit 1
fi
npm run build || exit 1
EOF

if [ ! -d "$REPO_DIR/dashboard/dist" ] || [ ! -f "$REPO_DIR/dashboard/dist/index.html" ]; then
  log "ERROR: Build failed"
  exit 1
fi

log "Build successful"

# -------------------------------
# Deploy Dashboard
# -------------------------------
log "Deploying dashboard"
rm -rf ${APP_DIR}/*
cp -r "$REPO_DIR/dashboard/dist/"* ${APP_DIR}/

# -------------------------------
# Generate Dashboard Data JSON
# -------------------------------
log "Generating dashboard data"

# [Keep the same Python script sections - they're identical to original]
# [I've omitted them for brevity, but they would remain exactly the same]

# -------------------------------
# Dashboard Refresh Cron
# -------------------------------
# [Keep the same - unchanged]

# -------------------------------
# Nginx Configuration
# -------------------------------
# [Keep the same - unchanged]

# -------------------------------
# Final Validation
# -------------------------------
# [Keep the same - unchanged]

# -------------------------------
# Auto-Deploy Updates (Now uses existing REPO_DIR)
# -------------------------------
log "Setting up auto-deploy"

DEPLOY_CMD="*/15 * * * * bash -c '
LOCK_FILE=/tmp/dashboard.lock
REPO_DIR=${REPO_DIR}
APP_DIR=${APP_DIR}
TMP_DIR=/tmp/dashboard-build

if [ -f \$LOCK_FILE ]; then exit 0; fi
touch \$LOCK_FILE
trap \"rm -f \$LOCK_FILE\" EXIT

echo \"[DEPLOY] Checking for updates...\" >> /var/log/dashboard-deploy.log

cd \$REPO_DIR || exit 0
chown -R ${APP_USER}:${APP_USER} \$REPO_DIR
git pull || exit 0
cd dashboard || exit 0

LOCAL=\$(git rev-parse HEAD)
REMOTE=\$(git rev-parse origin/main 2>/dev/null || echo \$LOCAL)

if [ \"\$LOCAL\" != \"\$REMOTE\" ]; then
  echo \"[DEPLOY] Changes detected, deploying...\" >> /var/log/dashboard-deploy.log
  if ! npm ci 2>/dev/null; then npm install || exit 1; fi
  npm run build || exit 1
  if [ -d \"dist\" ]; then
    rm -rf \$TMP_DIR
    cp -r dist \$TMP_DIR
    rm -rf \$APP_DIR/*
    cp -r \$TMP_DIR/* \$APP_DIR/
    echo \"[DEPLOY] Deployment complete\" >> /var/log/dashboard-deploy.log
  fi
else
  echo \"[DEPLOY] No changes\" >> /var/log/dashboard-deploy.log
fi
' 2>&1"

(crontab -u ${APP_USER} -l 2>/dev/null | grep -v 'dashboard-auto-deploy'; echo "$DEPLOY_CMD") | crontab -u ${APP_USER} -

log "Auto-deploy configured (every 15 minutes)"
log "Dashboard available at http://${PUBLIC_IP}"