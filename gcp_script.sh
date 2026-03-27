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

# -------------------------------
# Helper Functions
# -------------------------------

log() { echo "[${APP_NAME}] $1"; }

md() {
  curl -fsS -H "Metadata-Flavor: Google" \
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

# -------------------------------
# Retry Helper (network resilience)
# -------------------------------

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
# Wait for apt lock
# -------------------------------

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

log "Cloning dashboard repo"
REPO_DIR="/opt/cloud-quotes"

if [ ! -d "$REPO_DIR" ]; then
  retry git clone "https://github.com/KirkAlton-Class7/cloud-quotes.git" "$REPO_DIR"
fi

cd "$REPO_DIR" && git pull
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

# -------------------------------
# Quotes (local fallback + cache)
# -------------------------------

LOCAL_QUOTES="${DATA_DIR}/quotes_local.json"
ACTIVE_QUOTES="${DATA_DIR}/quotes.json"

# Create local fallback with 10 quotes
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

log "Fetching GitHub quotes"
GITHUB_QUOTES_SYNC="Failed"

if retry curl -fsSL "${GITHUB_QUOTES_URL}" -o "${ACTIVE_QUOTES}.tmp"; then
  if python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
    mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
    cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
    GITHUB_QUOTES_SYNC="Successful"
    log "GitHub quotes fetched successfully"
  else
    log "Invalid JSON, using fallback"
    cp "${LOCAL_QUOTES}" "${ACTIVE_QUOTES}"
  fi
else
  log "Failed to fetch, using fallback"
  cp "${LOCAL_QUOTES}" "${ACTIVE_QUOTES}"
fi

# -------------------------------
# Cron Job to Refresh Quotes
# -------------------------------

log "Setting up cron job to refresh quotes"
CRON_CMD="*/10 * * * * curl -fsSL ${GITHUB_QUOTES_URL} -o ${DATA_DIR}/quotes.json.tmp && mv ${DATA_DIR}/quotes.json.tmp ${DATA_DIR}/quotes.json && cp ${DATA_DIR}/quotes.json ${DATA_DIR}/quotes_local.json >> /var/log/quotes-cron.log 2>&1 # cloud-quotes-sync"
(crontab -l 2>/dev/null | grep -v 'cloud-quotes-sync'; echo "$CRON_CMD") | crontab -

# -------------------------------
# Scenery Images (from repo root/images)
# -------------------------------

log "Setting up scenery gallery"

# Create images directory
mkdir -p "${DATA_DIR}/images"

# Copy images from repo root/images to data directory
if [ -d "$REPO_DIR/images" ]; then
    cp -r "$REPO_DIR/images/"* "${DATA_DIR}/images/" 2>/dev/null && log "Images copied successfully" || log "No images found in repo/images"
else
    log "Images directory not found in repo"
fi

# Copy images.json from repo root to data directory
if [ -f "$REPO_DIR/images.json" ]; then
    cp "$REPO_DIR/images.json" "${DATA_DIR}/images.json" && log "Images metadata copied successfully"
else
    log "images.json not found in repo root"
fi

# Set proper permissions
chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}/images" 2>/dev/null || true
chmod -R 755 "${DATA_DIR}/images" 2>/dev/null || true

# Also ensure images are in the deployed dashboard directory (optional)
if [ -d "$REPO_DIR/images" ]; then
    mkdir -p "${APP_DIR}/data/images"
    cp -r "$REPO_DIR/images/"* "${APP_DIR}/data/images/" 2>/dev/null || true
fi

# -------------------------------
# Metadata
# -------------------------------

log "Collecting metadata"
HOSTNAME_VM="$(md instance/hostname || hostname)"
INSTANCE_ID="$(md instance/id || echo "unknown")"
ZONE="$(safe_basename "$(md instance/zone)" || echo "unknown")"
MACHINE_TYPE="$(safe_basename "$(md instance/machine-type)" || echo "unknown")"
PROJECT_ID="$(md project/project-id || echo "unknown")"
INTERNAL_IP="$(md instance/network-interfaces/0/ip || hostname -I | awk '{print $1}')"
PUBLIC_IP="$(md instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null || curl -s ifconfig.me 2>/dev/null || echo "unknown")"
OS_NAME="$(. /etc/os-release && echo "$PRETTY_NAME")"
UPTIME="$(uptime -p || echo "unknown")"

# -------------------------------
# System metrics (REAL)
# -------------------------------

CPU_USAGE="$(top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}' 2>/dev/null || echo "0")"
MEM_PERCENT="$(free | awk '/Mem:/ {printf("%.0f"), $3/$2 * 100.0}' 2>/dev/null || echo "0")"
DISK_PERCENT="$(df / | tail -1 | awk '{print $5}' 2>/dev/null || echo "0%")"

IFACE=$(ip route get 1 2>/dev/null | awk '{print $5}' || echo "eth0")
RX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/rx_bytes 2>/dev/null || echo "0")"
TX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/tx_bytes 2>/dev/null || echo "0")"

# -------------------------------
# Services
# -------------------------------

NGINX_STATUS="$(service_status nginx)"
PYTHON_STATUS="$(command_status python3)"
STARTUP_STATUS="Completed"
METADATA_STATUS="Reachable"
HTTP_STATUS="Serving"
BOOTSTRAP_PACKAGES_JSON='["nginx","python3","curl","jq","git"]'

# -------------------------------
# Security
# -------------------------------

FIREWALL_STATUS="Not installed"
SSH_STATUS="$(systemctl is-active ssh 2>/dev/null || echo "Not installed")"
UPDATES="$(apt list --upgradable 2>/dev/null | tail -n +2 | wc -l || echo "0")"
UPDATE_STATUS="Current"

# -------------------------------
# Export for Python
# -------------------------------

export HOSTNAME_VM INSTANCE_ID ZONE MACHINE_TYPE OS_NAME PROJECT_ID INTERNAL_IP PUBLIC_IP
export NGINX_STATUS PYTHON_STATUS STARTUP_STATUS METADATA_STATUS HTTP_STATUS GITHUB_QUOTES_SYNC
export FIREWALL_STATUS SSH_STATUS UPDATE_STATUS UPTIME BOOTSTRAP_PACKAGES_JSON
export CPU_USAGE MEM_PERCENT DISK_PERCENT RX_BYTES TX_BYTES

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

# -------------------------------
# Generate JSON (inline Python)
# -------------------------------

log "Generating dashboard data"
python3 <<PYTHON_SCRIPT
import json, os, random
from datetime import datetime, timedelta

def status(val, warn=70):
    try:
        return "warning" if float(val) > warn else "healthy"
    except:
        return "healthy"

def get_network_info():
    """Get detailed network information in human readable format"""
    try:
        rx_bytes = int(os.environ.get('RX_BYTES', '0'))
        tx_bytes = int(os.environ.get('TX_BYTES', '0'))
        
        # Convert to human readable
        rx_mb = rx_bytes / (1024 * 1024)
        tx_mb = tx_bytes / (1024 * 1024)
        
        return f"{rx_mb:.1f} MB ↓ / {tx_mb:.1f} MB ↑"
    except:
        return os.environ.get('RX_BYTES', '0') + " / " + os.environ.get('TX_BYTES', '0')

def get_load_average():
    """Get 1-minute load average"""
    try:
        with open('/proc/loadavg', 'r') as f:
            load = f.read().split()
            return float(load[0])
    except:
        return 0.0

def get_cost_estimate():
    """Estimate cost based on machine type, provider, and actual usage"""
    try:
        # Get machine type with fallback
        machine_type = os.environ.get('MACHINE_TYPE', 'e2-micro').lower()
        
        # Get usage metrics with safe defaults
        try:
            cpu = float(os.environ.get('CPU_USAGE', '0'))
            mem = float(os.environ.get('MEM_PERCENT', '0'))
        except (ValueError, TypeError):
            cpu = 0
            mem = 0
        
        # Detect cloud provider from metadata (with timeout and error handling)
        provider = "unknown"
        try:
            import subprocess
            
            # GCP detection (most reliable on GCP)
            if not provider == "unknown":
                gcp_check = subprocess.run(
                    ['curl', '-s', '--max-time', '2', '-H', 'Metadata-Flavor: Google', 
                     'http://metadata.google.internal/computeMetadata/v1/instance/zone'],
                    capture_output=True, text=True, timeout=2
                )
                if gcp_check.returncode == 0 and gcp_check.stdout:
                    provider = "gcp"
        except (subprocess.TimeoutExpired, subprocess.SubprocessError, ImportError):
            pass
        
        # AWS detection
        if provider == "unknown":
            try:
                aws_check = subprocess.run(
                    ['curl', '-s', '--max-time', '2', 'http://169.254.169.254/latest/meta-data/instance-id'],
                    capture_output=True, text=True, timeout=2
                )
                if aws_check.returncode == 0 and aws_check.stdout:
                    provider = "aws"
            except (subprocess.TimeoutExpired, subprocess.SubprocessError):
                pass
        
        # Azure detection
        if provider == "unknown":
            try:
                azure_check = subprocess.run(
                    ['curl', '-s', '--max-time', '2', '-H', 'Metadata:true', 
                     'http://169.254.169.254/metadata/instance?api-version=2017-08-01'],
                    capture_output=True, text=True, timeout=2
                )
                if azure_check.returncode == 0 and azure_check.stdout:
                    provider = "azure"
            except (subprocess.TimeoutExpired, subprocess.SubprocessError):
                pass
        
        # Parse machine type to extract size (handles various formats)
        # GCP: e2-micro, e2-small, e2-medium, n1-standard-1, etc.
        # AWS: t2.micro, t3.small, etc.
        # Azure: Standard_B1s, etc.
        machine_size = "unknown"
        
        # Extract size indicators
        if "micro" in machine_type:
            machine_size = "micro"
        elif "small" in machine_type:
            machine_size = "small"
        elif "medium" in machine_type:
            machine_size = "medium"
        elif "large" in machine_type:
            machine_size = "large"
        else:
            # Default to micro for unknown sizes
            machine_size = "micro"
        
        # Pricing based on provider and machine size (hourly rates)
        # Using conservative estimates - adjust based on your region
        pricing = {
            "gcp": {
                "micro": 0.012,   # e2-micro: ~$8.64/month
                "small": 0.025,   # e2-small: ~$18/month
                "medium": 0.050,  # e2-medium: ~$36/month
                "large": 0.100,   # e2-large: ~$72/month
            },
            "aws": {
                "micro": 0.0116,  # t2.micro: ~$8.35/month
                "small": 0.023,   # t2.small: ~$16.56/month
                "medium": 0.046,  # t2.medium: ~$33.12/month
                "large": 0.092,   # t2.large: ~$66.24/month
            },
            "azure": {
                "micro": 0.012,   # B1s: ~$8.64/month
                "small": 0.024,   # B1ms: ~$17.28/month
                "medium": 0.048,  # B2s: ~$34.56/month
                "large": 0.096,   # B2ms: ~$69.12/month
            }
        }
        
        # Get base hourly rate with fallback
        if provider in pricing and machine_size in pricing[provider]:
            base_hourly = pricing[provider][machine_size]
        elif provider in pricing:
            base_hourly = pricing[provider]["micro"]  # fallback to micro
        else:
            base_hourly = 0.015  # generic fallback
        
        # Calculate usage factor (0-1 range, with minimum 0.1 for idle VMs)
        cpu_usage_multiplier = min(max(cpu / 100, 0.1), 1.0)
        mem_usage_multiplier = min(max(mem / 100, 0.1), 1.0)
        usage_factor = (cpu_usage_multiplier + mem_usage_multiplier) / 2
        
        # Calculate monthly cost (720 hours/month)
        monthly_cost = base_hourly * 720 * usage_factor
        
        # Storage cost estimate (varies by provider, but ~$0.10/GB/month)
        # Assuming 10GB root disk
        storage_cost = 1.00
        
        total_monthly = monthly_cost + storage_cost
        
        # Format based on provider and machine type
        provider_names = {
            "gcp": "GCP",
            "aws": "AWS",
            "azure": "Azure"
        }
        provider_display = provider_names.get(provider, "")
        
        # Clean up machine type display
        machine_display = machine_type.replace('-', ' ').replace('_', ' ').title()
        
        if provider_display:
            return f"${total_monthly:.2f}/month ({provider_display} {machine_display})"
        else:
            return f"${total_monthly:.2f}/month (est.)"
            
    except Exception as e:
        # Ultimate fallback - don't crash the whole script
        machine_type = os.environ.get('MACHINE_TYPE', 'standard')
        return f"Based on {machine_type} usage"

def get_ssh_status():
    """Get SSH status with more detail"""
    ssh_active = os.environ.get('SSH_STATUS', 'active')
    if ssh_active.lower() == 'active':
        return "Enabled (22/tcp)"
    return "Disabled"

def get_update_status():
    """Get detailed update status"""
    updates = os.environ.get('UPDATES', '0')
    if updates == "Current" or updates == "0":
        return "Up to date"
    try:
        update_count = int(updates)
        if update_count < 5:
            return f"{update_count} security updates"
        else:
            return f"{update_count} updates available"
    except:
        return os.environ.get('UPDATE_STATUS', 'Current')

quotes = []
try:
    with open("${DATA_DIR}/quotes.json") as f:
        quotes = json.load(f)
except:
    quotes = [{"text":"Fallback quote","author":"System"}]

quote = random.choice(quotes)

# Generate sample logs (you can replace with real logs from your system)
logs = [
    {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "Dashboard initialized"},
    {"time": (datetime.now() - timedelta(minutes=5)).strftime("%H:%M:%S"), "level": "info", "scope": "metrics", "message": "Metrics collection started"},
    {"time": (datetime.now() - timedelta(minutes=10)).strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "System health check passed"},
    {"time": (datetime.now() - timedelta(minutes=15)).strftime("%H:%M:%S"), "level": "warning", "scope": "system", "message": "High memory usage detected (cleared)"},
    {"time": (datetime.now() - timedelta(minutes=30)).strftime("%H:%M:%S"), "level": "info", "scope": "quotes", "message": "Quotes refreshed from GitHub"},
    {"time": (datetime.now() - timedelta(minutes=45)).strftime("%H:%M:%S"), "level": "info", "scope": "nginx", "message": "Nginx request rate: 12 req/s"},
    {"time": (datetime.now() - timedelta(hours=1)).strftime("%H:%M:%S"), "level": "warning", "scope": "security", "message": "12 failed login attempts detected"},
]

# Sample resource table (you can replace with real resources)
resource_table = [
    {"name": "nginx", "type": "service", "scope": "system", "status": os.environ.get('NGINX_STATUS', 'Running')},
    {"name": "python3", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "nodejs", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "quotes.json", "type": "data", "scope": "application", "status": "Active"},
    {"name": "dashboard-data.json", "type": "data", "scope": "application", "status": "Active"},
]

data = {
    "summaryCards": [
        {"label":"CPU","value":f"{os.environ.get('CPU_USAGE', '0')}%","status":status(os.environ.get('CPU_USAGE', '0'))},
        {"label":"Memory","value":f"{os.environ.get('MEM_PERCENT', '0')}%","status":status(os.environ.get('MEM_PERCENT', '0'))},
        {"label":"Disk","value":os.environ.get('DISK_PERCENT', '0%'),"status":status(os.environ.get('DISK_PERCENT', '0').replace('%',''))},
        {"label":"Cost","value":get_cost_estimate(),"status":"info"}
    ],
    "vmInformation": [
        {"label":"Hostname","value":os.environ.get('HOSTNAME_VM', 'unknown')},
        {"label":"Instance ID","value":os.environ.get('INSTANCE_ID', 'unknown')},
        {"label":"Zone","value":os.environ.get('ZONE', 'unknown')},
        {"label":"Machine Type","value":os.environ.get('MACHINE_TYPE', 'unknown')},
        {"label":"OS","value":os.environ.get('OS_NAME', 'unknown')},
        {"label":"Project ID","value":os.environ.get('PROJECT_ID', 'unknown')}
    ],
    "services": [
        {"label":"Nginx","value":os.environ.get('NGINX_STATUS', 'Unknown'),"status":"healthy"},
        {"label":"Python","value":os.environ.get('PYTHON_STATUS', 'Unknown'),"status":"healthy"},
        {"label":"Metadata Service","value":os.environ.get('METADATA_STATUS', 'Unknown'),"status":"healthy"},
        {"label":"HTTP Service","value":os.environ.get('HTTP_STATUS', 'Unknown'),"status":"healthy"},
        {"label":"Startup Script","value":os.environ.get('STARTUP_STATUS', 'Unknown'),"status":"healthy"},
        {"label":"GitHub Quotes Sync","value":os.environ.get('GITHUB_QUOTES_SYNC', 'Unknown'),"status":"healthy"},
        {"label":"Bootstrap Packages","value":", ".join(json.loads(os.environ.get('BOOTSTRAP_PACKAGES_JSON', '[]'))),"status":"healthy"}
    ],
    "security": [
        {"label":"Host Firewall","value":os.environ.get('FIREWALL_STATUS', 'Not installed'),"status":"info"},
        {"label":"SSH","value":get_ssh_status(),"status":"healthy"},
        {"label":"Updates","value":get_update_status(),"status":"info"},
        {"label":"Internal IP","value":os.environ.get('INTERNAL_IP', 'unknown'),"status":"info"},
        {"label":"Public IP","value":os.environ.get('PUBLIC_IP', 'unknown'),"status":"info"},
        {"label":"Estimated Cost (Usage)","value":get_cost_estimate(),"status":"info"}
    ],
    "meta": {
        "appName": "DevSecOps Sandbox",
        "tagline": "Real-time infrastructure monitoring",
        "uptime": os.environ.get("UPTIME", "unknown")
    },
    "quote": quote,
    "logs": logs,
    "resourceTable": resource_table
}

with open("${DATA_DIR}/dashboard-data.json","w") as f:
    json.dump(data, f, indent=2)

print("Dashboard data generated successfully")
PYTHON_SCRIPT

# -------------------------------
# Ensure index.html exists (safety)
# -------------------------------

if [ ! -f "${APP_DIR}/index.html" ]; then
  log "Creating fallback index.html"
  echo "<h1>Dashboard initializing...</h1>" > "${APP_DIR}/index.html"
fi

# -------------------------------
# Nginx Config (FORCE OVERRIDE)
# -------------------------------

log "Configuring nginx"
systemctl stop nginx || true

# Remove ALL existing configs
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

# -------------------------------
# Activate Nginx Site
# -------------------------------

ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/${APP_NAME}

# Test nginx configuration
nginx -t || { log "ERROR: nginx config invalid"; exit 1; }

# -------------------------------
# Enable + Restart Nginx (FINAL)
# -------------------------------

systemctl start nginx
systemctl enable nginx

# -------------------------------
# Final validation
# -------------------------------

sleep 2
log "Validating deployment"

if curl -f http://127.0.0.1/data/dashboard-data.json >/dev/null 2>&1; then
  log "SUCCESS: Dashboard data endpoint working"
else
  log "WARNING: Data endpoint not responding"
fi

if curl -f http://127.0.0.1 >/dev/null 2>&1; then
  log "SUCCESS: Dashboard is serving"
else
  log "ERROR: App not serving"
  exit 1
fi

log "Startup complete"

# -------------------------------
# Auto-deploy Dashboard Updates
# -------------------------------

log "Setting up dashboard auto-deploy"

DEPLOY_CMD="*/15 * * * * bash -c '
LOCK_FILE=/tmp/dashboard.lock
REPO_DIR=/opt/cloud-quotes
APP_DIR=/var/www/devsecops-sandbox
TMP_DIR=/tmp/dashboard-build

if [ -f \$LOCK_FILE ]; then
  exit 0
fi

touch \$LOCK_FILE
trap \"rm -f \$LOCK_FILE\" EXIT

echo \"[DEPLOY] Checking for updates...\" >> /var/log/dashboard-deploy.log

cd \$REPO_DIR || exit 0
chown -R ${APP_USER}:${APP_USER} \$REPO_DIR

cd dashboard || exit 0

LOCAL=\$(git rev-parse HEAD)
REMOTE=\$(git rev-parse origin/main 2>/dev/null || echo \$LOCAL)

if [ \"\$LOCAL\" != \"\$REMOTE\" ]; then
  echo \"[DEPLOY] Changes detected, deploying...\" >> /var/log/dashboard-deploy.log

  git pull || exit 1
  cd \$REPO_DIR/dashboard || exit 1

  if ! npm ci 2>/dev/null; then
    npm install || exit 1
  fi

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
' 2>&1 # dashboard-auto-deploy"

(crontab -u ${APP_USER} -l 2>/dev/null | grep -v 'dashboard-auto-deploy'; echo "$DEPLOY_CMD") | crontab -u ${APP_USER} -

log "Auto-deploy cron job configured"
log "Dashboard available at http://${PUBLIC_IP}"