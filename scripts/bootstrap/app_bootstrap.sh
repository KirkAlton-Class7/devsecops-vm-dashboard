#!/usr/bin/env bash

# -------------------------------
# Dashboard configuration
# -------------------------------
DASHBOARD_APP_NAME="GCP Deployment"
DASHBOARD_TAGLINE="Infrastructure health and activity"
DASHBOARD_USER="Kirk Alton"
DASHBOARD_NAME="DevSecOps Dashboard"

# ---------------------------------
# React build link configuration
# ---------------------------------
export VITE_GITHUB_URL="https://github.com/KirkAlton-Class7"
export VITE_LINKEDIN_URL="https://www.linkedin.com/in/kirkcochranjr/"

# =================================
# END OF CONFIGURATION
# ---------------------------------
# Modify sections below with caution.
# ==================================

GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json"

APP_USER="appuser"
APP_NAME="vm-dashboard"
APP_DIR="/var/www/${APP_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
DATA_DIR="${APP_DIR}/data"

export DEBIAN_FRONTEND=noninteractive
export DASHBOARD_APP_NAME DASHBOARD_TAGLINE DASHBOARD_USER DASHBOARD_NAME
export HOME=/root

exec > /var/log/startup-script.log 2>&1
set -x
set -uo pipefail

log() { echo "[${APP_NAME}] $1"; }

log "Dashboard customization:"
log "  App Name: ${DASHBOARD_APP_NAME}"
log "  Tagline: ${DASHBOARD_TAGLINE}"
log "  User: ${DASHBOARD_USER}"
log "  Dashboard Name: ${DASHBOARD_NAME}"

# ---------------------------------
# Shared helper functions
# ---------------------------------
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
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 2; done
  log "Apt lock released"
}

mkdir -p /opt

# ---------------------------------
# Install base system packages
# ---------------------------------
wait_for_apt
retry apt-get update -y

wait_for_apt
retry apt-get install -y \
  nginx \
  python3 \
  python3-pip \
  curl \
  jq \
  ca-certificates \
  git \
  build-essential

# ---------------------------------
# Install Google Cloud CLI
# ---------------------------------
if ! command -v gcloud >/dev/null 2>&1; then
    log "Installing Google Cloud SDK"
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
    wait_for_apt
    apt-get update -y
    apt-get install -y google-cloud-sdk
fi

# ---------------------------------
# Install Node.js runtime
# ---------------------------------
if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js"
  retry curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# ----------------------------------------
# Prepare Python package tooling
# -----------------------------------------
log "Upgrading pip and required libraries"
python3 -m pip install --upgrade pip
pip3 install --upgrade urllib3 requests

# ---------------------------------
# Install BigQuery client library
# ---------------------------------
log "Installing google-cloud-bigquery"
pip3 install --upgrade google-cloud-bigquery

# Upgrade Monitoring client library (fixes list_time_series aggregation error)
log "Upgrading google-cloud-monitoring"
pip3 install --upgrade google-cloud-monitoring

# ---------------------------------
# Install Monitoring client library
# ---------------------------------
log "Installing google-cloud-monitoring"
pip3 install --upgrade google-cloud-monitoring

# ---------------------------------
# Create app user and directories
# ---------------------------------
if ! id "${APP_USER}" >/dev/null 2>&1; then
  log "Creating user ${APP_USER}"
  useradd -m -s /bin/bash "${APP_USER}"
fi

mkdir -p "${APP_DIR}" "${DATA_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}"

# ---------------------------------
# Validate and sync repository
# ---------------------------------
REPO_DIR="/opt/deploy"
if [ ! -d "$REPO_DIR" ]; then
  log "ERROR: Repo not found at $REPO_DIR. The wrapper script is expected to clone it before this step."
  exit 1
fi
cd "$REPO_DIR" && git pull
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

# ---------------------------------
# Stage utility scripts
# ---------------------------------
mkdir -p /opt/scripts
if [ -d "$REPO_DIR/scripts" ]; then
    cp -rf "$REPO_DIR/scripts/"* /opt/scripts/ 2>/dev/null
    chmod +x /opt/scripts/*.py /opt/scripts/*.sh 2>/dev/null
    log "Scripts copied to /opt/scripts"
fi

# ---------------------------------
# Generate initial pricing cache
# ---------------------------------
if [ -f "/opt/scripts/fetch_pricing.py" ]; then
    chmod +x /opt/scripts/fetch_pricing.py
    export DATA_DIR
    /opt/scripts/fetch_pricing.py
    log "Initial pricing cache generated"
fi

# ---------------------------------
# Seed fallback quote data
# ---------------------------------
LOCAL_QUOTES="${DATA_DIR}/quotes_local.json"
ACTIVE_QUOTES="${DATA_DIR}/quotes.json"
cat > "${LOCAL_QUOTES}" <<'EOF'
[
  {"id":1,"text":"He who has a why...","author":"Friedrich Nietzsche","tags":["purpose"]},
  {"id":2,"text":"We all make choices...","author":"Andrew Ryan","source":"BioShock","tags":["choices"]},
  {"id":3,"text":"Perfection isn't possible...","author":"Vince Lombardi","tags":["excellence"]},
  {"id":4,"text":"You can't cross the sea...","author":"Rabindranath Tagore","tags":["action"]},
  {"id":5,"text":"The greatest loss...","author":"Norman Cousins","tags":["purpose"]},
  {"id":6,"text":"Easy choices, hard life...","author":"Jerzy Gregorek","tags":["discipline"]},
  {"id":7,"text":"We are what we pretend...","author":"Kurt Vonnegut","tags":["identity"]},
  {"id":8,"text":"Success is the sum...","author":"Robert Collier","tags":["consistency"]},
  {"id":9,"text":"A question opens the mind...","author":"Unattributed","tags":["thinking"]},
  {"id":10,"text":"Nothing comes from nothing...","author":"Rodgers & Hammerstein","source":"The Sound of Music","tags":["action"]}
]
EOF

# ---------------------------------
# Configure scheduled jobs
# ---------------------------------
log "Setting up cron: quotes every 10 minutes"
CRON_CMD="*/10 * * * * curl -fsSL ${GITHUB_QUOTES_URL} -o ${DATA_DIR}/quotes.json.tmp && mv ${DATA_DIR}/quotes.json.tmp ${DATA_DIR}/quotes.json && cp ${DATA_DIR}/quotes.json ${DATA_DIR}/quotes_local.json >> /var/log/quotes-cron.log 2>&1 # vm-dashboard-sync"
(crontab -l 2>/dev/null | grep -v 'vm-dashboard-sync'; echo "$CRON_CMD") | crontab -

log "Setting up pricing cron (monthly)"
(crontab -l 2>/dev/null | grep -v 'fetch_pricing.py'; echo "0 3 1 * * export DATA_DIR=/var/www/vm-dashboard/data && /opt/scripts/fetch_pricing.py >> /var/log/pricing-cron.log 2>&1") | crontab -

# ---------------------------------
# Stage photo gallery assets
# ---------------------------------
log "Setting up photo gallery"
mkdir -p "${DATA_DIR}/images"
if [ -d "$REPO_DIR/images" ]; then
    cp -rf "$REPO_DIR/images/"* "${DATA_DIR}/images/" 2>/dev/null && log "Images copied"
fi
chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}/images" 2>/dev/null || true
chmod -R 755 "${DATA_DIR}/images" 2>/dev/null || true

# ---------------------------------
# Configure dashboard API service
# ---------------------------------
log "Setting up Flask API service"
API_SCRIPT="/opt/deploy/scripts/dashboard_api.py"
if [ ! -f "$API_SCRIPT" ]; then
    log "ERROR: dashboard_api.py not found at $API_SCRIPT"
    exit 1
fi
chmod +x "$API_SCRIPT"

cat > /etc/systemd/system/dashboard-api.service << EOF
[Unit]
Description=Dashboard API & Metadata Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/deploy/scripts
ExecStart=/usr/bin/python3 $API_SCRIPT
Restart=always
RestartSec=5
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="HOME=/root"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dashboard-api.service
systemctl start dashboard-api.service
sleep 2

if systemctl is-active --quiet dashboard-api.service; then
    log "SUCCESS: Dashboard API server running on port 8080"
else
    log "ERROR: Dashboard API server failed to start"
    systemctl status dashboard-api.service --no-pager
    exit 1
fi

# ---------------------------------
# Build and deploy React dashboard
# ---------------------------------
log "Building dashboard"
cd "$REPO_DIR/dashboard" || { log "ERROR: dashboard dir missing"; exit 1; }
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

# Ensure npm cache is writable by appuser
mkdir -p /home/${APP_USER}/.npm
chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}/.npm

sudo -u ${APP_USER} bash <<EOF
cd "$REPO_DIR/dashboard"
export HOME=/home/${APP_USER}
if ! npm ci 2>/dev/null; then
  npm install || exit 1
fi
npm run build || exit 1
EOF

if [ ! -d "$REPO_DIR/dashboard/dist" ] || [ ! -f "$REPO_DIR/dashboard/dist/index.html" ]; then
  log "ERROR: Build failed - dist missing"
  exit 1
fi
log "Build successful"

log "Deploying dashboard"
rm -rf ${APP_DIR}/*
cp -r "$REPO_DIR/dashboard/dist/"* ${APP_DIR}/
chown -R ${APP_USER}:${APP_USER} ${APP_DIR}

# ---------------------------------
# Refresh quote data
# ---------------------------------
log "Force fetching quotes"
retry curl -fsSL "${GITHUB_QUOTES_URL}" -o "${ACTIVE_QUOTES}.tmp"
if [ $? -eq 0 ] && [ -s "${ACTIVE_QUOTES}.tmp" ]; then
    if python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
        mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
        cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
        log "Quotes loaded"
    else
        rm -f "${ACTIVE_QUOTES}.tmp"
    fi
fi

# ---------------------------------
# Ensure frontend entrypoint exists
# ---------------------------------
if [ ! -f "${APP_DIR}/index.html" ]; then
    log "Creating fallback index.html"
    echo "<h1>Dashboard initializing...</h1>" > "${APP_DIR}/index.html"
fi

# ---------------------------------
# Configure Nginx HTTP site
# ---------------------------------
log "Configuring nginx"
systemctl stop nginx || true
rm -f /etc/nginx/sites-enabled/*
rm -f /etc/nginx/sites-available/default

cat > "${NGINX_SITE}" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root ${APP_DIR};
    index index.html;
    location = /healthz {
        access_log off;
        return 200 'ok\n';
        add_header Content-Type text/plain;
    }
    location = /metadata {
        proxy_pass http://127.0.0.1:8080/metadata;
        proxy_set_header Host \$host;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /data/ {
        alias ${DATA_DIR}/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store";
        types { image/webp webp; image/jpeg jpg jpeg; image/png png; }
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/${APP_NAME}
nginx -t || { log "ERROR: nginx config invalid"; exit 1; }
systemctl start nginx
systemctl enable nginx

# ---------------------------------
# Resolve public access IP
# ---------------------------------
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

# ---------------------------------
# Validate local deployment
# ---------------------------------
sleep 2
log "Validating deployment"

if curl -f http://127.0.0.1:8080/api/dashboard >/dev/null 2>&1; then
    log "SUCCESS: Dashboard API endpoint working"
else
    log "WARNING: Dashboard API endpoint not responding"
fi

if curl -f http://127.0.0.1 >/dev/null 2>&1; then
    log "SUCCESS: Dashboard frontend serving"
else
    log "ERROR: Dashboard frontend not serving"
    exit 1
fi

log "Startup complete"

# ---------------------------------
# Apply final image metadata
# ---------------------------------
if [ -f "$REPO_DIR/images.json" ]; then
    cp -f "$REPO_DIR/images.json" "${DATA_DIR}/images.json"
    chown ${APP_USER}:${APP_USER} "${DATA_DIR}/images.json"
    chmod 644 "${DATA_DIR}/images.json"
    log "Final images.json applied"
fi

# ---------------------------------
# Configure auto-deploy schedule
# ---------------------------------
log "Setting up auto-deploy"
cat > /opt/dashboard-deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
LOCK_FILE=/tmp/dashboard.lock
REPO_DIR=/opt/deploy
APP_DIR=/var/www/vm-dashboard
DATA_DIR=/var/www/vm-dashboard/data
TMP_DIR=/tmp/dashboard-build

if [ -f "$LOCK_FILE" ]; then exit 0; fi
touch "$LOCK_FILE"
trap "rm -f \"$LOCK_FILE\"" EXIT

cd "$REPO_DIR" || exit 0
chown -R appuser:appuser "$REPO_DIR"
cd dashboard || exit 0

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL")

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "[DEPLOY] Changes detected, deploying..." >> /var/log/dashboard-deploy.log
    git pull || exit 1
    cd "$REPO_DIR/dashboard" || exit 1

    if [ -f "$REPO_DIR/scripts/fetch_pricing.py" ]; then
        cp -f "$REPO_DIR/scripts/fetch_pricing.py" /opt/scripts/fetch_pricing.py
        chmod +x /opt/scripts/fetch_pricing.py
        export DATA_DIR="$DATA_DIR"
        /opt/scripts/fetch_pricing.py
    fi

    if [ -d "$REPO_DIR/images" ]; then
        cp -rf "$REPO_DIR/images/"* "$DATA_DIR/images/" 2>/dev/null
    fi

    # Regenerate images.json from images folder
    python3 << 'INNER_PY'
import json, os
img_dir = os.environ.get('DATA_DIR', '/var/www/vm-dashboard/data') + '/images'
images = []
extensions = ('.jpg', '.jpeg', '.png', '.webp')
for idx, fname in enumerate(sorted(os.listdir(img_dir)), start=1):
    if fname.lower().endswith(extensions):
        name_parts = fname.replace('_', ' ').split('.')[0].title()
        location = name_parts.split()[0] if ' ' in name_parts else name_parts
        images.append({
            "id": idx,
            "filename": fname,
            "title": name_parts,
            "location": location,
            "photographer": "VM Gallery",
            "tags": ["travel", "nature"]
        })
with open(f"{img_dir.rsplit('/',1)[0]}/images.json", "w") as f:
    json.dump(images, f, indent=2)
INNER_PY

    chown -R appuser:appuser "$DATA_DIR/images" 2>/dev/null || true
    chmod -R 755 "$DATA_DIR/images" 2>/dev/null || true

    # Ensure npm cache is writable for auto-deploy
    mkdir -p /home/appuser/.npm
    chown -R appuser:appuser /home/appuser/.npm
    if ! npm ci 2>/dev/null; then npm install || exit 1; fi
    npm run build || exit 1

    if [ -d "dist" ]; then
        rm -rf "$TMP_DIR"
        cp -r dist "$TMP_DIR"
        rm -rf "$APP_DIR"/*
        cp -r "$TMP_DIR"/* "$APP_DIR"/
        echo "[DEPLOY] Deployment complete" >> /var/log/dashboard-deploy.log
    fi
else
    echo "[DEPLOY] No changes" >> /var/log/dashboard-deploy.log
fi
DEPLOY_SCRIPT

chmod +x /opt/dashboard-deploy.sh
(crontab -u ${APP_USER} -l 2>/dev/null | grep -v 'dashboard-deploy.sh'; echo "*/15 * * * * /opt/dashboard-deploy.sh >> /var/log/dashboard-deploy.log 2>&1") | crontab -u ${APP_USER} -

log "Auto-deploy cron job configured (every 15 minutes)"
log "Dashboard available at http://${PUBLIC_IP}"
