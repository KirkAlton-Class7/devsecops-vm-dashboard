#!/usr/bin/env bash

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

# ---------------------------------------------------------------------------------------------
# !!! END OF CONFIGURATION - DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING !!!
# ---------------------------------------------------------------------------------------------

# Repo to pull the dashboard code from (can be changed to your fork)
REPO_URL="https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git"

# URL to fetch quotes from (must be a valid quotes.json file inside your repo)
GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json"

# -------------------------------
# System User
# -------------------------------
APP_USER="appuser"

# -------------------------------
# Application Paths
# -------------------------------
# Where the dashboard files are stored on the VM
APP_NAME="vm-dashboard"
APP_DIR="/var/www/${APP_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
DATA_DIR="${APP_DIR}/data"

# -------------------------------
# Environment Setup
# -------------------------------
# Disable interactive prompts during package installation
export DEBIAN_FRONTEND=noninteractive

# Export dashboard variables so Python can access them
export DASHBOARD_APP_NAME
export DASHBOARD_TAGLINE
export DASHBOARD_USER
export DASHBOARD_NAME

# git requires HOME for config when run as root
export HOME=/root

# -------------------------------
# Logging & Debugging
# -------------------------------
# Send all output (stdout + stderr) to a log file
exec > /var/log/startup-script.log 2>&1

# Print every command before executing (for debugging)
set -x

# Exit on unset variables and pipeline failures (makes script safer)
set -uo pipefail

# ----------------------------
# Log Dashboard Customization
# ----------------------------
# Dashboard logging function
log() { echo "[${APP_NAME}] $1"; }

# Log dashboard cusotmization (for debugging)
log "Dashboard customization:"
log "  App Name: ${DASHBOARD_APP_NAME}"
log "  Tagline: ${DASHBOARD_TAGLINE}"
log "  User: ${DASHBOARD_USER}"
log "  Dashboard Name: ${DASHBOARD_NAME}"

# -------------------------------
# Helper Functions
# -------------------------------

# ---------------------------------
# Retry Helper (network resilience)
# ---------------------------------

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

# -------------------------------
# Wait for APT Lock Lock
# -------------------------------
# Waits for apt lock to release hold that prevents apt commands form running simultaneously

wait_for_apt() {
  log "Waiting for apt lock..."
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
    sleep 2
  done
  log "Apt lock released"
}

# -------------------------------
# File System Initialization
# -------------------------------

mkdir -p /opt

# -------------------------------
# Install packages
# -------------------------------

wait_for_apt
retry apt-get update -y

wait_for_apt
retry apt-get install -y \
  nginx \
  python3 \
  curl \
  jq \
  ca-certificates \
  git \
  build-essential

# -------------------------------
# Install Node.js
# -------------------------------

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js"
  retry curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# ---------------------------------
# Create App User for App Installs
# ---------------------------------

if ! id "${APP_USER}" >/dev/null 2>&1; then
  log "Creating user ${APP_USER}"
  useradd -m -s /bin/bash "${APP_USER}"
fi

# -------------------------------
# Application Directory Setup
# -------------------------------

mkdir -p "${APP_DIR}" "${DATA_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}"

# --------------------------------
# Clone Repo
# --------------------------------

log "Cloning dashboard repo from ${REPO_URL}"
REPO_DIR="/opt/${APP_NAME}"

if [ ! -d "$REPO_DIR" ]; then
  retry git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR" && git pull
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

# -------------------------------
# Copy all utility scripts from repo
# -------------------------------
mkdir -p /opt/scripts
if [ -d "$REPO_DIR/scripts" ]; then
    cp -rf "$REPO_DIR/scripts/"* /opt/scripts/ 2>/dev/null
    chmod +x /opt/scripts/*.py /opt/scripts/*.sh 2>/dev/null
    log "All scripts copied to /opt/scripts"
else
    log "No scripts directory found in repo"
fi

# -------------------------------
# Enable fetch pricing script
# -------------------------------
# Make fetch_pricing.py executable and run it once
if [ -f "/opt/scripts/fetch_pricing.py" ]; then
    chmod +x /opt/scripts/fetch_pricing.py
    export DATA_DIR
    /opt/scripts/fetch_pricing.py
    log "Initial pricing cache generated"
else
    log "No fetch_pricing.py found in repo"
fi

# -------------------------------
# Quotes (local fallback + cache)
# -------------------------------

LOCAL_QUOTES="${DATA_DIR}/quotes_local.json"
ACTIVE_QUOTES="${DATA_DIR}/quotes.json"

# Create local fallback quotes.json
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
# Cron Job to Refresh Quotes
# -------------------------------

log "Setting up cron job to refresh quotes"
CRON_CMD="*/10 * * * * curl -fsSL ${GITHUB_QUOTES_URL} -o ${DATA_DIR}/quotes.json.tmp && mv ${DATA_DIR}/quotes.json.tmp ${DATA_DIR}/quotes.json && cp ${DATA_DIR}/quotes.json ${DATA_DIR}/quotes_local.json >> /var/log/quotes-cron.log 2>&1 # vm-dashboard-sync"
(crontab -l 2>/dev/null | grep -v 'vm-dashboard-sync'; echo "$CRON_CMD") | crontab -

# -------------------------------
# Pricing Cache Cron (monthly)
# -------------------------------
log "Setting up pricing cache cron job"
(crontab -l 2>/dev/null | grep -v 'fetch_pricing.py'; echo "0 3 1 * * export DATA_DIR=/var/www/vm-dashboard/data && /opt/scripts/fetch_pricing.py >> /var/log/pricing-cron.log 2>&1") | crontab -
log "Pricing cache cron job configured (monthly)"

# ---------------------------------------
# Generate Photo Gallery Images (from repo images)
# ---------------------------------------
# This now dynamically generates images.json from the actual image files

log "Setting up photo gallery"

# Create images directory
mkdir -p "${DATA_DIR}/images"

# Copy images from repo root/images to data directory (force overwrite)
if [ -d "$REPO_DIR/images" ]; then
    cp -rf "$REPO_DIR/images/"* "${DATA_DIR}/images/" 2>/dev/null && log "Images copied successfully" || log "No images found in repo/images"
else
    log "Images directory not found in repo"
fi

# Export for Python
export DATA_DIR

# Set proper permissions
chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}/images" 2>/dev/null || true
chmod -R 755 "${DATA_DIR}/images" 2>/dev/null || true

# Also ensure images are in the deployed dashboard directory (optional)
if [ -d "$REPO_DIR/images" ]; then
    mkdir -p "${APP_DIR}/data/images"
    cp -rf "$REPO_DIR/images/"* "${APP_DIR}/data/images/" 2>/dev/null || true
fi

# -------------------------------
# Build Dashboard
# -------------------------------

log "Building dashboard"
cd "$REPO_DIR/dashboard" || { log "ERROR: dashboard directory not found"; exit 1; }
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

# Run build as application user
sudo -u ${APP_USER} bash <<EOF
cd "$REPO_DIR/dashboard"
if ! npm ci 2>/dev/null; then
  npm install || exit 1
fi
npm run build || exit 1
EOF

# Validate build
if [ ! -d "$REPO_DIR/dashboard/dist" ] || [ ! -f "$REPO_DIR/dashboard/dist/index.html" ]; then
  log "ERROR: Build failed - dist missing"
  exit 1
fi

log "Build successful"

# -------------------------------
# Deploy Dashboard
# -------------------------------

log "Deploying dashboard"
rm -rf ${APP_DIR}/*
cp -r "$REPO_DIR/dashboard/dist/"* ${APP_DIR}/

# --------------------
# Fetch GitHub Quotes
# --------------------
# Fetches latest quotes with curl, validates JSON, falls back to wget if needed, and verifies no fallback quotes remain

log "Force fetching GitHub quotes before generating dashboard data"

# Force download from GitHub - always get latest
retry curl -fsSL "${GITHUB_QUOTES_URL}" -o "${ACTIVE_QUOTES}.tmp"

if [ $? -eq 0 ] && [ -s "${ACTIVE_QUOTES}.tmp" ]; then
    # Validate JSON
    if python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
        mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
        cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
        log "GitHub quotes loaded successfully"
        
        # Show first quote for verification
        FIRST_QUOTE=$(python3 -c "import json; print(json.load(open('${ACTIVE_QUOTES}'))[0]['text'][:60])" 2>/dev/null || echo "Unknown")
        log "First quote: ${FIRST_QUOTE}..."
    else
        log "Invalid JSON from GitHub, keeping existing quotes"
        rm -f "${ACTIVE_QUOTES}.tmp"
    fi
else
    log "Failed to fetch GitHub quotes, using existing file if available"
fi

# Show final quote count
if [ -f "${ACTIVE_QUOTES}" ]; then
    QUOTE_COUNT=$(python3 -c "import json; print(len(json.load(open('${ACTIVE_QUOTES}'))))" 2>/dev/null || echo "0")
    log "Final quotes file has ${QUOTE_COUNT} quotes"
    
    # If fallback quotes still present, try wget as last resort
    if grep -q "Nietzsche" "${ACTIVE_QUOTES}"; then
        log "WARNING: Fallback quotes detected. Retrying with wget..."
        wget -q -O "${ACTIVE_QUOTES}.tmp" "${GITHUB_QUOTES_URL}"
        if [ $? -eq 0 ] && python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
            mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
            cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
            log "Second attempt successful. GitHub quotes loaded."
        else
            log "Second attempt failed. Keeping existing quotes."
        fi
    else
        log "Verified: GitHub quotes are ready"
    fi
fi

# -------------------------------
# Ensure index.html Exists
# -------------------------------
# Creates a fallback page if the built dashboard is missing

if [ ! -f "${APP_DIR}/index.html" ]; then
  log "Creating fallback index.html"
  echo "<h1>Dashboard initializing...</h1>" > "${APP_DIR}/index.html"
fi

# -------------------------------
# Nginx Configuration
# -------------------------------
# Sets up nginx to serve the dashboard, data, health check, and metadata proxy
# Removes any existing configurations to prevent conflicts

log "Configuring nginx"
systemctl stop nginx || true

# Remove ALL existing configs
rm -f /etc/nginx/sites-enabled/*
rm -f /etc/nginx/sites-available/default

# Create site config
cat > "${NGINX_SITE}" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    root ${APP_DIR};
    index index.html;
    
    # Health check endpoint – handled directly by nginx
    location = /healthz {
        access_log off;
        return 200 'ok\n';
        add_header Content-Type text/plain;
    }
    
    # Metadata endpoint – proxy to Python server on port 8080
    location = /metadata {
        proxy_pass http://127.0.0.1:8080/metadata;
        proxy_set_header Host \$host;
    }
    
    # API proxy for live dashboard data
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    # Data directory (static JSON files, images, quotes)
    location /data/ {
        alias ${DATA_DIR}/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store";
        types {
            image/webp webp;
            image/jpeg jpg jpeg;
            image/png png;
        }
    }
    
    # Dashboard SPA – fallback to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Verify the config was created
if [ ! -f "${NGINX_SITE}" ]; then
    log "ERROR: Failed to create ${NGINX_SITE}"
    exit 1
fi

# -------------------------------
# Activate Site
# -------------------------------
# Enables the new configuration and tests it

ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/${APP_NAME}

# Test nginx configuration
nginx -t || { log "ERROR: nginx config invalid"; exit 1; }

# -------------------------------
# Start Nginx
# -------------------------------
# Enables nginx to start on boot and starts the service

systemctl start nginx
systemctl enable nginx

# -------------------------------
# Get Public IP for final message
# -------------------------------
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

# -------------------------------
# Final Deployment Validation
# -------------------------------
sleep 2
log "Validating deployment"

# Check that the Flask API is reachable (serves dashboard data)
if curl -f http://127.0.0.1:8080/api/dashboard >/dev/null 2>&1; then
  log "SUCCESS: Dashboard API endpoint working"
else
  log "WARNING: Dashboard API endpoint not responding"
fi

# Check that nginx is serving the frontend
if curl -f http://127.0.0.1 >/dev/null 2>&1; then
  log "SUCCESS: Dashboard frontend is serving"
else
  log "ERROR: Dashboard frontend not serving"
  exit 1
fi

log "Startup complete"

# ----------------------------------------------------------------------
# Copy images.json (final unconditional)
# ----------------------------------------------------------------------
# NOTE: RACE CONDITION 
# The repo's images.json might not be present during the initial copy
# due to git operation delays. This unconditional copy guarantees
# the file is placed after all builds complete.
if [ -f "$REPO_DIR/images.json" ]; then
    cp -f "$REPO_DIR/images.json" "${DATA_DIR}/images.json"
    chown ${APP_USER}:${APP_USER} "${DATA_DIR}/images.json"
    chmod 644 "${DATA_DIR}/images.json"
    log "Final safety copy of images.json applied"
else
    log "ERROR: images.json not found in repo at final stage"
fi

# -------------------------------
# Auto-Deploy Dashboard Updates
# -------------------------------
# Cron job that checks for new commits every 15 minutes and rebuilds/deploys if changes are detected
# Uses a lock file to prevent multiple concurrent deployments

log "Setting up dashboard auto-deploy"

# Create the deployment script
cat > /opt/dashboard-deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
LOCK_FILE=/tmp/dashboard.lock
REPO_DIR=/opt/vm-dashboard
APP_DIR=/var/www/vm-dashboard
DATA_DIR=/var/www/vm-dashboard/data
TMP_DIR=/tmp/dashboard-build

# Prevent concurrent runs
if [ -f "$LOCK_FILE" ]; then
  exit 0
fi
touch "$LOCK_FILE"
trap "rm -f \"$LOCK_FILE\"" EXIT

echo "[DEPLOY] Checking for updates..." >> /var/log/dashboard-deploy.log

# Navigate to repo and ensure ownership
cd "$REPO_DIR" || exit 0
chown -R appuser:appuser "$REPO_DIR"

cd dashboard || exit 0

# Compare local HEAD with remote main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL")

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "[DEPLOY] Changes detected, deploying..." >> /var/log/dashboard-deploy.log

  # Pull latest code
  git pull || exit 1
  cd "$REPO_DIR/dashboard" || exit 1

  # Update pricing script (copy from repo if changed, then run)
  if [ -f "$REPO_DIR/scripts/fetch_pricing.py" ]; then
    cp -f "$REPO_DIR/scripts/fetch_pricing.py" /opt/scripts/fetch_pricing.py
    chmod +x /opt/scripts/fetch_pricing.py
    export DATA_DIR="$DATA_DIR"
    /opt/scripts/fetch_pricing.py
  fi

  # Copy latest images and regenerate metadata (force overwrite)
  if [ -d "$REPO_DIR/images" ]; then
    cp -rf "$REPO_DIR/images/"* "$DATA_DIR/images/" 2>/dev/null
  fi
  # Regenerate images.json dynamically
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

  # Install dependencies and build
  if ! npm ci 2>/dev/null; then
    npm install || exit 1
  fi
  npm run build || exit 1

  # Atomic deploy: copy to temp, then replace live directory
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

# Make the script executable
chmod +x /opt/dashboard-deploy.sh

# Set up cron job to run every 15 minutes
(crontab -u ${APP_USER} -l 2>/dev/null | grep -v 'dashboard-deploy.sh'; echo "*/15 * * * * /opt/dashboard-deploy.sh >> /var/log/dashboard-deploy.log 2>&1") | crontab -u ${APP_USER} -

log "Auto-deploy cron job configured (every 15 minutes)"
log "Dashboard available at http://${PUBLIC_IP}"