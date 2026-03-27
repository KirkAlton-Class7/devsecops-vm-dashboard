#!/usr/bin/env bash

APP_USER="appuser"

exec > /var/log/startup-script.log 2>&1
set -x

set -uo pipefail

APP_NAME="devsecops-sandbox"
APP_DIR="/var/www/${APP_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
DATA_DIR="${APP_DIR}/data"

GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/cloud-quotes/main/quotes.json"

export DEBIAN_FRONTEND=noninteractive

log() { echo "[${APP_NAME}] $1"; }

retry() {
  local n=0
  local max=5
  local delay=2
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

# Install system packages
wait_for_apt
retry apt-get update -y
wait_for_apt
retry apt-get install -y nginx python3 curl jq ca-certificates git

# Install Node.js
if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js"
  retry curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Create app user
if ! id "${APP_USER}" >/dev/null 2>&1; then
  log "Creating user ${APP_USER}"
  useradd -m -s /bin/bash "${APP_USER}"
fi

# Setup directories
mkdir -p "${APP_DIR}" "${DATA_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}"

# Clone repository
log "Cloning dashboard repo"
REPO_DIR="/opt/cloud-quotes"
if [ ! -d "$REPO_DIR" ]; then
  retry git clone "https://github.com/KirkAlton-Class7/cloud-quotes.git" "$REPO_DIR"
fi

cd "$REPO_DIR" && git pull
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

# Fetch quotes
log "Fetching quotes"
if retry curl -fsSL "${GITHUB_QUOTES_URL}" -o "${DATA_DIR}/quotes.json"; then
  log "Quotes fetched successfully"
else
  log "Failed to fetch quotes, using fallback"
  cat > "${DATA_DIR}/quotes.json" <<'EOF'
[
  {"id": 1, "text": "He who has a why to live for can bear almost any how.", "author": "Friedrich Nietzsche"},
  {"id": 2, "text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"}
]
EOF
fi

# Setup cron job for quotes refresh
log "Setting up cron job to refresh quotes"
CRON_CMD="*/10 * * * * curl -fsSL ${GITHUB_QUOTES_URL} -o ${DATA_DIR}/quotes.json.tmp && mv ${DATA_DIR}/quotes.json.tmp ${DATA_DIR}/quotes.json >> /var/log/quotes-cron.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'quotes.json'; echo "$CRON_CMD") | crontab -

# Build dashboard
log "Building dashboard"
cd "$REPO_DIR/dashboard"

log "Running npm install..."
sudo -u ${APP_USER} npm install 2>&1 | tail -5

log "Running npm build..."
sudo -u ${APP_USER} npm run build 2>&1 | tail -5

# Verify build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
  log "ERROR: Build failed"
  exit 1
fi

log "Build successful"

# Deploy dashboard
log "Deploying dashboard"
rm -rf ${APP_DIR}/*
cp -r dist/* ${APP_DIR}/

# Ensure data directory exists
mkdir -p ${DATA_DIR}
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}

# Create dashboard data JSON with actual quotes
log "Creating dashboard data"
python3 <<PYTHON_SCRIPT
import json
import random
import os

# Load quotes
quotes_file = "${DATA_DIR}/quotes.json"
try:
    with open(quotes_file) as f:
        quotes = json.load(f)
except:
    quotes = [{"text": "Welcome to the dashboard!", "author": "System"}]

# Select random quote
quote = random.choice(quotes)

# Create the dashboard data structure
data = {
    "summaryCards": [
        {"label": "CPU", "value": "15%", "status": "healthy"},
        {"label": "Memory", "value": "26%", "status": "healthy"},
        {"label": "Disk", "value": "38%", "status": "healthy"},
        {"label": "Network", "value": "Active", "status": "healthy"}
    ],
    "vmInformation": [
        {"label": "Hostname", "value": os.uname().nodename},
        {"label": "Instance ID", "value": "GCP-VM"},
        {"label": "Zone", "value": "us-central1"},
        {"label": "Machine Type", "value": "e2-micro"},
        {"label": "OS", "value": "Debian GNU/Linux 12"},
        {"label": "Project ID", "value": "devsecops-project"}
    ],
    "services": [
        {"label": "Nginx", "value": "Running"},
        {"label": "Python", "value": "Installed"},
        {"label": "Metadata Service", "value": "Available"},
        {"label": "HTTP Service", "value": "Serving"},
        {"label": "Startup Script", "value": "Completed"},
        {"label": "GitHub Quotes Sync", "value": "Active"},
        {"label": "Bootstrap Packages", "value": "nginx, nodejs, git"}
    ],
    "security": [
        {"label": "Host Firewall", "value": "Active"},
        {"label": "SSH", "value": "Running"},
        {"label": "Updates", "value": "Current"},
        {"label": "Internal IP", "value": "10.128.0.2"},
        {"label": "Public IP", "value": "Assigned"}
    ],
    "meta": {
        "appName": "DevSecOps Sandbox Dashboard",
        "uptime": os.popen("uptime -p").read().strip()
    },
    "quote": quote
}

# Write the JSON file
with open("${DATA_DIR}/dashboard-data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Dashboard data created successfully")
PYTHON_SCRIPT

# Configure nginx
log "Configuring nginx"
systemctl stop nginx || true

# Remove default configs
rm -f /etc/nginx/sites-enabled/*
rm -f /etc/nginx/sites-available/default

# Create our site config
cat > "${NGINX_SITE}" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    root ${APP_DIR};
    index index.html;
    
    location /data/ {
        alias ${DATA_DIR}/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store";
    }
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable our site
ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/${APP_NAME}

# Test and start nginx
nginx -t || { log "ERROR: nginx config invalid"; exit 1; }
systemctl start nginx
systemctl enable nginx

# Final verification
sleep 2
if curl -s http://localhost | grep -q "devsecops-dashboard"; then
    log "SUCCESS: Dashboard is running!"
else
    log "WARNING: Dashboard may not be running correctly"
fi

log "Startup complete - Dashboard available at http://$(curl -s ifconfig.me)"