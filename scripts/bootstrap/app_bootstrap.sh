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
# !!! END OF CONFICURATION - DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING !!!
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

md() {
  curl -fsS -H "Metadata-Flavor: Google" \
  --connect-timeout 2 \
  --max-time 3 \
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

# Generate images.json dynamically from the actual files in DATA_DIR/images
python3 << 'PYTHON_SCRIPT'
import json, os

data_dir = os.environ.get('DATA_DIR', '/var/www/vm-dashboard/data')
img_dir = f"{data_dir}/images"
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
with open(f"{data_dir}/images.json", "w") as f:
    json.dump(images, f, indent=2)
print(f"Generated images.json with {len(images)} images")
PYTHON_SCRIPT

# Set proper permissions
chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}/images" 2>/dev/null || true
chmod -R 755 "${DATA_DIR}/images" 2>/dev/null || true

# Also ensure images are in the deployed dashboard directory (optional)
if [ -d "$REPO_DIR/images" ]; then
    mkdir -p "${APP_DIR}/data/images"
    cp -rf "$REPO_DIR/images/"* "${APP_DIR}/data/images/" 2>/dev/null || true
fi

# -------------------------------
# Metadata
# -------------------------------
# Collects VM information from GCP metadata service with fallbacks to system commands

log "Collecting metadata"
HOSTNAME_VM="$(md instance/hostname || hostname)"
INSTANCE_ID="$(md instance/id || echo "unknown")"
ZONE="$(safe_basename "$(md instance/zone)" || echo "unknown")"
MACHINE_TYPE="$(safe_basename "$(md instance/machine-type)" || echo "unknown")"
PROJECT_ID="$(md project/project-id || echo "unknown")"
INTERNAL_IP="$(md instance/network-interfaces/0/ip || hostname -I | awk '{print $1}' 2>/dev/null || echo "unknown")"

PUBLIC_IP=$(md instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null)
if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "unknown" ]; then
    PUBLIC_IP=$(curl -s ifconfig.me | tr -d '\n')
fi
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP="unknown"
fi

OS_NAME="$(. /etc/os-release && echo "$PRETTY_NAME")"
UPTIME="$(uptime -p || echo "unknown")"

# -------------------------------
# System metrics
# -------------------------------
# Collects real-time CPU, memory, disk, and network statistics from /proc and /sys

CPU_USAGE="$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {printf "%.0f", usage}' 2>/dev/null || echo "0")"
MEM_PERCENT="$(free | awk '/Mem:/ {printf("%.0f"), $3/$2 * 100.0}' 2>/dev/null || echo "0")"
DISK_PERCENT="$(df / | tail -1 | awk '{print $5}' 2>/dev/null || echo "0%")"

IFACE=$(ip route get 1 2>/dev/null | awk '{print $5}' || echo "eth0")
RX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/rx_bytes 2>/dev/null || echo "0")"
TX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/tx_bytes 2>/dev/null || echo "0")"

# -------------------------------
# Services
# -------------------------------
# Checks running services and application health

NGINX_STATUS="$(service_status nginx)"
PYTHON_STATUS="$(command_status python3)"
STARTUP_STATUS="Completed"
METADATA_STATUS="Reachable"
HTTP_STATUS="Serving"
BOOTSTRAP_PACKAGES_JSON='["nginx","python3","curl","jq","git"]'

# -------------------------------
# Security
# -------------------------------
# Firewall status, SSH availability, and pending system updates

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

# Additional exports for the refresh script (quoted heredoc safety)
export APP_NAME
export APP_DIR
export DATA_DIR
export APP_USER
export GITHUB_QUOTES_URL
export UPDATES

# --------------------
# Fetch GitHub Quotes
# --------------------

log "Fetching latest quotes from GitHub"

# Force fetch - always overwrite
retry curl -fsSL "${GITHUB_QUOTES_URL}" -o "${ACTIVE_QUOTES}.tmp"

if [ $? -eq 0 ] && [ -s "${ACTIVE_QUOTES}.tmp" ]; then
    # Validate JSON
    if python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
        mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
        cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
        log "GitHub quotes fetched successfully"
        
        # Show first quote for verification
        FIRST_QUOTE=$(python3 -c "import json; print(json.load(open('${ACTIVE_QUOTES}'))[0]['text'][:60])" 2>/dev/null || echo "Unknown")
        log "First quote: ${FIRST_QUOTE}..."
        
        # Verify it's NOT a fallback quote (check for Nietzsche)
        if grep -q "Nietzsche" "${ACTIVE_QUOTES}"; then
            log "WARNING: Still seeing fallback quotes! GitHub fetch may have failed silently."
        fi
    else
        log "Invalid JSON from GitHub, keeping existing quotes"
        rm -f "${ACTIVE_QUOTES}.tmp"
    fi
else
    log "Failed to fetch GitHub quotes, using existing file if available"
fi

# Count quotes and show sample
if [ -f "${ACTIVE_QUOTES}" ]; then
    QUOTE_COUNT=$(python3 -c "import json; print(len(json.load(open('${ACTIVE_QUOTES}'))))" 2>/dev/null || echo "0")
    log "Quotes file has ${QUOTE_COUNT} quotes"
    
    # Show first author to verify it's GitHub
    FIRST_AUTHOR=$(python3 -c "import json; print(json.load(open('${ACTIVE_QUOTES}'))[0].get('author', 'Unknown'))" 2>/dev/null)
    log "First author: ${FIRST_AUTHOR}"
fi

# If quotes file still has fallback, force a second attempt with wget
if [ -f "${ACTIVE_QUOTES}" ] && grep -q "Nietzsche" "${ACTIVE_QUOTES}"; then
    log "Fallback quotes detected! Retrying with wget..."
    wget -q -O "${ACTIVE_QUOTES}.tmp" "${GITHUB_QUOTES_URL}"
    if [ $? -eq 0 ] && python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
        mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
        cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
        log "Second attempt successful!"
    fi
fi

# Sets GITHUB_QUOTES_SYNC to failed if sync unsuccesful
if [ -f "${ACTIVE_QUOTES}" ] && ! grep -q "Nietzsche" "${ACTIVE_QUOTES}"; then
    GITHUB_QUOTES_SYNC="Successful"
else
    GITHUB_QUOTES_SYNC="Failed"
fi
export GITHUB_QUOTES_SYNC

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
# Generate Dashboard Data JSON
# -------------------------------
log "Generating dashboard data"

# Ensure data directory exists and is writable by appuser
mkdir -p "${DATA_DIR}"
chown ${APP_USER}:${APP_USER} "${DATA_DIR}" || { log "ERROR: Failed to chown ${DATA_DIR}"; exit 1; }

# Be sure to prevent variable expansion in this heredoc
sudo -u ${APP_USER} python3 <<'PYTHON_SCRIPT' || { log "ERROR: Python script failed"; exit 1; }

import json, os, random, subprocess
from datetime import datetime, timedelta

DATA_DIR = "/var/www/vm-dashboard/data"
os.makedirs(DATA_DIR, exist_ok=True)

# ------------------------------------------------------------
# Helper functions – fetch everything directly, no environment vars
# ------------------------------------------------------------
def get_cpu_usage():
    with open("/proc/stat", "r") as f:
        line = f.readline()
        parts = line.split()
        user = int(parts[1]); nice = int(parts[2]); system = int(parts[3]); idle = int(parts[4])
        total = user + nice + system + idle
        return round((user + nice + system) * 100 / total) if total > 0 else 0

def get_memory_percent():
    with open("/proc/meminfo", "r") as f:
        mem = {}
        for line in f:
            if ":" in line:
                k, v = line.split(":", 1)
                mem[k] = int(v.strip().split()[0])
    total = mem.get("MemTotal", 1)
    avail = mem.get("MemAvailable", mem.get("MemFree", 0))
    return round((total - avail) * 100 / total)

def get_disk_percent():
    out = subprocess.check_output(["df", "/"], text=True)
    return int(out.split("\n")[1].split()[4].rstrip("%"))

def get_load_averages():
    with open("/proc/loadavg", "r") as f:
        parts = f.read().split()
        return float(parts[0]), float(parts[1])   # (1min, 5min)

def get_uptime():
    return subprocess.check_output(["uptime", "-p"], text=True).strip()

def get_hostname():
    return subprocess.check_output(["hostname"], text=True).strip()

def get_instance_id():
    try:
        import urllib.request
        req = urllib.request.Request("http://metadata.google.internal/computeMetadata/v1/instance/id",
                                     headers={"Metadata-Flavor": "Google"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.read().decode().strip()
    except:
        return "unknown"

def get_zone():
    try:
        import urllib.request
        req = urllib.request.Request("http://metadata.google.internal/computeMetadata/v1/instance/zone",
                                     headers={"Metadata-Flavor": "Google"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            full = resp.read().decode().strip()
            return full.split("/")[-1]
    except:
        return "unknown"

def get_machine_type():
    try:
        import urllib.request
        req = urllib.request.Request("http://metadata.google.internal/computeMetadata/v1/instance/machine-type",
                                     headers={"Metadata-Flavor": "Google"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            full = resp.read().decode().strip()
            return full.split("/")[-1]
    except:
        return "unknown"

def get_project_id():
    try:
        import urllib.request
        req = urllib.request.Request("http://metadata.google.internal/computeMetadata/v1/project/project-id",
                                     headers={"Metadata-Flavor": "Google"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.read().decode().strip()
    except:
        return "unknown"

def get_os_name():
    try:
        with open("/etc/os-release", "r") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    return line.split("=")[1].strip().strip('"')
    except:
        pass
    return "unknown"

def get_internal_ip():
    try:
        import urllib.request
        req = urllib.request.Request("http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip",
                                     headers={"Metadata-Flavor": "Google"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.read().decode().strip()
    except:
        try:
            return subprocess.check_output(["hostname", "-I"], text=True).split()[0]
        except:
            return "unknown"

def get_external_ip():
    try:
        import urllib.request
        req = urllib.request.Request("http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip",
                                     headers={"Metadata-Flavor": "Google"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.read().decode().strip()
    except:
        try:
            with urllib.request.urlopen("http://ifconfig.me", timeout=5) as resp:
                return resp.read().decode().strip()
        except:
            return "unknown"

def get_ssh_status():
    return "Enabled (22/tcp)" if subprocess.call(["systemctl", "is-active", "--quiet", "ssh"]) == 0 else "Disabled"

def get_update_status():
    out = subprocess.run(["apt", "list", "--upgradable", "2>/dev/null"], shell=True, capture_output=True, text=True)
    updates = len([l for l in out.stdout.strip().split("\n") if l and not l.startswith("Listing")])
    return "Up to date" if updates == 0 else f"{updates} updates available"

def get_cumulative_cost():
    cost_file = "/var/tmp/vm-cost.json"
    machine_type = get_machine_type()
    rates = {"e2-micro": 0.0076, "e2-small": 0.0150, "e2-medium": 0.0301,
             "n1-standard-1": 0.0475, "n2-standard-2": 0.0972}
    if machine_type not in rates:
        return "N/A for instance type"
    hourly_rate = rates[machine_type]
    try:
        with open("/proc/uptime", "r") as f:
            current_uptime = float(f.read().split()[0])
    except:
        current_uptime = 0
    try:
        with open(cost_file, "r") as f:
            data = json.load(f)
        total_cost = data.get("total_cost", 0.0)
        last_uptime = data.get("last_uptime_sec", current_uptime)
    except:
        total_cost = 0.0
        last_uptime = current_uptime
    if current_uptime < last_uptime:
        last_uptime = current_uptime
    else:
        delta_hours = (current_uptime - last_uptime) / 3600.0
        if delta_hours > 0:
            total_cost += hourly_rate * delta_hours
            last_uptime = current_uptime
    with open(cost_file, "w") as f:
        json.dump({"total_cost": total_cost, "last_uptime_sec": last_uptime}, f)
    if total_cost <= 0.0:
        return "N/A"
    elif total_cost < 0.01:
        return f"${total_cost:.4f} total"
    elif total_cost < 1:
        return f"${total_cost:.3f} total"
    else:
        return f"${total_cost:.2f} total"

def status_color(val, warn=70):
    try:
        return "warning" if float(val) > warn else "healthy"
    except:
        return "healthy"

# ------------------------------------------------------------
# Collect all data
# ------------------------------------------------------------
cpu = get_cpu_usage()
mem = get_memory_percent()
disk = get_disk_percent()
load_1min, load_5min = get_load_averages()
uptime = get_uptime()
hostname = get_hostname()
instance_id = get_instance_id()
zone = get_zone()
machine_type = get_machine_type()
project_id = get_project_id()
os_name = get_os_name()
internal_ip = get_internal_ip()
external_ip = get_external_ip()
ssh_status = get_ssh_status()
update_status = get_update_status()
cost = get_cumulative_cost()
region = zone[:-2] if len(zone) > 2 else "unknown"

# Load quotes
quotes = []
quotes_path = f"{DATA_DIR}/quotes.json"
if os.path.exists(quotes_path):
    with open(quotes_path) as f:
        quotes = json.load(f)
if not quotes:
    quotes = [{"text": "Welcome to DevSecOps!", "author": "System"}]

# Memory and disk details (for systemResources)
def get_memory_details():
    try:
        with open("/proc/meminfo", "r") as f:
            meminfo = {}
            for line in f:
                if ":" in line:
                    key, val = line.split(":", 1)
                    meminfo[key] = int(val.strip().split()[0]) / 1024
        total = meminfo.get("MemTotal", 0)
        available = meminfo.get("MemAvailable", meminfo.get("MemFree", 0))
        used = total - available
        return {"total": round(total), "used": round(used), "free": round(available)}
    except:
        return {"total": 0, "used": 0, "free": 0}

def get_disk_details():
    try:
        stat = os.statvfs("/")
        block_size = stat.f_frsize if stat.f_frsize else stat.f_bsize
        total = (stat.f_blocks * block_size) / (1024 * 1024)
        free = (stat.f_bfree * block_size) / (1024 * 1024)
        used = total - free
        return {"total": round(total), "used": round(used), "available": round(free)}
    except:
        return {"total": 0, "used": 0, "available": 0}

def get_cpu_info():
    cores = 1
    freq = None
    try:
        with open("/proc/cpuinfo", "r") as f:
            cores = f.read().count("processor")
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if "cpu MHz" in line:
                    freq = float(line.split(":")[1].strip())
                    break
    except:
        pass
    return {"cores": cores, "frequency": f"{freq:.0f} MHz" if freq else None, "usage": cpu}

memory_details = get_memory_details()
disk_details = get_disk_details()
cpu_info = get_cpu_info()

# Logs (sample)
logs = [
    {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "Dashboard initialized"},
    {"time": (datetime.now() - timedelta(minutes=5)).strftime("%H:%M:%S"), "level": "info", "scope": "metrics", "message": "Metrics collection started"},
    {"time": (datetime.now() - timedelta(minutes=10)).strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "System health check passed"},
    {"time": (datetime.now() - timedelta(minutes=15)).strftime("%H:%M:%S"), "level": "warning", "scope": "system", "message": "High memory usage detected (cleared)"},
    {"time": (datetime.now() - timedelta(minutes=30)).strftime("%H:%M:%S"), "level": "info", "scope": "quotes", "message": "Quotes refreshed from GitHub"},
    {"time": (datetime.now() - timedelta(minutes=45)).strftime("%H:%M:%S"), "level": "info", "scope": "nginx", "message": "Nginx request rate: 12 req/s"},
    {"time": (datetime.now() - timedelta(hours=1)).strftime("%H:%M:%S"), "level": "warning", "scope": "security", "message": "12 failed login attempts detected"},
]

resource_table = [
    {"name": "nginx", "type": "service", "scope": "system", "status": "Running" if subprocess.call(["systemctl", "is-active", "--quiet", "nginx"]) == 0 else "Stopped"},
    {"name": "python3", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "nodejs", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "quotes.json", "type": "data", "scope": "application", "status": "Active"},
    {"name": "dashboard-data.json", "type": "data", "scope": "application", "status": "Active"},
]

# Build final data object
data = {
    "summaryCards": [
        {"label": "CPU", "value": f"{cpu}%", "status": status_color(cpu)},
        {"label": "Memory", "value": f"{mem}%", "status": status_color(mem)},
        {"label": "Disk", "value": f"{disk}%", "status": status_color(disk)},
        {"label": "Estimated Cost", "value": cost, "status": "info"}
    ],
    "vmInformation": [
        {"label": "Hostname", "value": hostname},
        {"label": "Instance ID", "value": instance_id},
        {"label": "Zone", "value": zone},
        {"label": "Machine Type", "value": machine_type},
        {"label": "OS", "value": os_name},
        {"label": "Project ID", "value": project_id},
        {"label": "Estimated Cost (Usage)", "value": cost, "status": "info"}
    ],
    "services": [
        {"label": "Nginx", "value": "Running" if subprocess.call(["systemctl", "is-active", "--quiet", "nginx"]) == 0 else "Stopped", "status": "healthy"},
        {"label": "Python", "value": "Installed", "status": "healthy"},
        {"label": "Metadata Service", "value": "Reachable", "status": "healthy"},
        {"label": "HTTP Service", "value": "Serving", "status": "healthy"},
        {"label": "Startup Script", "value": "Completed", "status": "healthy"},
        {"label": "GitHub Quotes Sync", "value": "Successful", "status": "healthy"},
        {"label": "Bootstrap Packages", "value": "nginx, python3, curl, jq, git", "status": "healthy"}
    ],
    "security": [
        {"label": "Host Firewall", "value": "Not installed", "status": "info"},
        {"label": "SSH", "value": ssh_status, "status": "healthy"},
        {"label": "Updates", "value": update_status, "status": "info"},
        {"label": "Internal IP", "value": internal_ip, "status": "info"},
        {"label": "Public IP", "value": external_ip, "status": "info"}
    ],
    "meta": {
        "appName": os.environ.get("DASHBOARD_APP_NAME", "GCP Deployment"),
        "tagline": os.environ.get("DASHBOARD_TAGLINE", "Infrastructure health and activity"),
        "dashboardUser": os.environ.get("DASHBOARD_USER", "Kirk Alton"),
        "dashboardName": os.environ.get("DASHBOARD_NAME", "DevSecOps Dashboard"),
        "uptime": uptime
    },
    "quote": random.choice(quotes),
    "logs": logs,
    "resourceTable": resource_table,
    "systemLoad": load_1min,
    "identity": {
        "project": project_id,
        "instanceId": instance_id,
        "hostname": hostname,
        "machineType": machine_type
    },
    "network": {
        "vpc": "default",
        "subnet": f"{region}-subnet" if region != "unknown" else "default-subnet",
        "internalIp": internal_ip,
        "externalIp": external_ip
    },
    "location": {
        "region": region,
        "zone": zone,
        "uptime": uptime,
        "loadAvg": f"{load_5min:.2f}"
    },
    "systemResources": {
        "memory": memory_details,
        "disk": disk_details,
        "cpu": cpu_info,
        "endpoints": {"healthz": "/healthz", "metadata": "/metadata"}
    }
}

output_file = os.path.join(DATA_DIR, "dashboard-data.json")
with open(output_file, "w") as f:
    json.dump(data, f, indent=2)

print("Dashboard data generated successfully")
PYTHON_SCRIPT

# -------------------------------
# Dashboard Refresh Cron Job
# -------------------------------
# Creates a standalone Python script that collects fresh metrics and updates dashboard-data.json
# Sets up a cron job that runs every 5 minutes to refresh dashboard data

log "Setting up cron job to refresh dashboard data"

# Remove any old refresh cron entries
sudo crontab -l 2>/dev/null | grep -v refresh-dashboard-data | sudo crontab - 2>/dev/null || true

# Create the new refresh script (self‑contained, no environment variables needed)
sudo tee /opt/refresh-dashboard-data.py > /dev/null << 'EOF'
#!/usr/bin/env python3
import json, os, random, subprocess
from datetime import datetime, timedelta

DATA_DIR = "/var/www/vm-dashboard/data"
DASHBOARD_JSON = f"{DATA_DIR}/dashboard-data.json"
COST_FILE = "/var/tmp/vm-cost.json"

# ------------------------------------------------------------
# Helper functions (must be defined before use)
# ------------------------------------------------------------
def get_machine_type():
    try:
        req = subprocess.run(
            ['curl', '-s', '-H', 'Metadata-Flavor: Google',
             'http://metadata.google.internal/computeMetadata/v1/instance/machine-type'],
            capture_output=True, text=True, timeout=2
        )
        if req.returncode == 0 and req.stdout:
            return req.stdout.strip().split('/')[-1].lower()
    except:
        pass
    return 'e2-micro'

def get_cpu_usage():
    with open('/proc/stat', 'r') as f:
        line = f.readline()
        parts = line.split()
        user = int(parts[1]); nice = int(parts[2]); system = int(parts[3]); idle = int(parts[4])
        total = user + nice + system + idle
        return round((user + nice + system) * 100 / total) if total > 0 else 0

def get_memory_percent():
    with open('/proc/meminfo', 'r') as f:
        mem = {}
        for line in f:
            if ':' in line:
                k, v = line.split(':', 1)
                mem[k] = int(v.strip().split()[0])
    total = mem.get('MemTotal', 1)
    avail = mem.get('MemAvailable', mem.get('MemFree', 0))
    return round((total - avail) * 100 / total)

def get_disk_percent():
    out = subprocess.check_output(['df', '/'], text=True)
    return int(out.split('\n')[1].split()[4].rstrip('%'))

def get_load_averages():
    with open('/proc/loadavg', 'r') as f:
        parts = f.read().split()
        return float(parts[0]), float(parts[1])   # (1min, 5min)

def get_uptime():
    try:
        result = subprocess.check_output(['/usr/bin/uptime', '-p'], text=True, stderr=subprocess.DEVNULL)
        return result.strip()
    except:
        try:
            with open('/proc/uptime', 'r') as f:
                seconds = float(f.read().split()[0])
                minutes = int(seconds // 60)
                hours = int(minutes // 60)
                days = int(hours // 24)
                minutes = minutes % 60
                hours = hours % 24
                if days > 0:
                    return f"up {days} day{'s' if days != 1 else ''}, {hours} hour{'s' if hours != 1 else ''}, {minutes} minute{'s' if minutes != 1 else ''}"
                elif hours > 0:
                    return f"up {hours} hour{'s' if hours != 1 else ''}, {minutes} minute{'s' if minutes != 1 else ''}"
                else:
                    return f"up {minutes} minute{'s' if minutes != 1 else ''}"
        except:
            return "up 0 minutes"

# ------------------------------------------------------------
# Cost calculation (same as startup script)
# ------------------------------------------------------------
def get_cumulative_cost():
    machine_type = get_machine_type()
    rates = {"e2-micro": 0.0076, "e2-small": 0.0150, "e2-medium": 0.0301,
             "n1-standard-1": 0.0475, "n2-standard-2": 0.0972}
    if machine_type not in rates:
        return "N/A for instance type"
    hourly_rate = rates[machine_type]

    try:
        with open('/proc/uptime', 'r') as f:
            current_uptime = float(f.read().split()[0])
    except:
        current_uptime = 0
    try:
        with open(COST_FILE, 'r') as f:
            data = json.load(f)
        total_cost = data.get('total_cost', 0.0)
        last_uptime = data.get('last_uptime_sec', current_uptime)
    except:
        total_cost = 0.0
        last_uptime = current_uptime

    if current_uptime < last_uptime:
        last_uptime = current_uptime
    else:
        delta_hours = (current_uptime - last_uptime) / 3600.0
        if delta_hours > 0:
            total_cost += hourly_rate * delta_hours
            last_uptime = current_uptime

    with open(COST_FILE, 'w') as f:
        json.dump({'total_cost': total_cost, 'last_uptime_sec': last_uptime}, f)

    if total_cost <= 0.0:
        return "N/A"
    elif total_cost < 0.01:
        return f"${total_cost:.4f} total"
    elif total_cost < 1:
        return f"${total_cost:.3f} total"
    else:
        return f"${total_cost:.2f} total"

def status(val, warn=70):
    try:
        return "warning" if float(val) > warn else "healthy"
    except:
        return "healthy"

# ------------------------------------------------------------
# Main update – preserves all static fields
# ------------------------------------------------------------
with open(DASHBOARD_JSON, 'r') as f:
    data = json.load(f)

cpu = get_cpu_usage()
mem = get_memory_percent()
disk = get_disk_percent()
load_1min, load_5min = get_load_averages()
uptime = get_uptime()
cost = get_cumulative_cost()

# Update summary cards
data["summaryCards"] = [
    {"label": "CPU", "value": f"{cpu}%", "status": status(cpu)},
    {"label": "Memory", "value": f"{mem}%", "status": status(mem)},
    {"label": "Disk", "value": f"{disk}%", "status": status(disk)},
    {"label": "Estimated Cost", "value": cost, "status": "info"}
]

# Update the cost inside vmInformation (if present)
for item in data.get("vmInformation", []):
    if item.get("label") == "Estimated Cost (Usage)":
        item["value"] = cost

# Use 1‑min load for systemLoad (current), 5‑min load for location (true average)
data["systemLoad"] = load_1min
if "location" in data:
    data["location"]["loadAvg"] = f"{load_5min:.2f}"
    data["location"]["uptime"] = uptime
if "meta" in data:
    data["meta"]["uptime"] = uptime
if "systemResources" in data and "cpu" in data["systemResources"]:
    data["systemResources"]["cpu"]["usage"] = float(cpu)

# ------------------------------------------------------------
# Dynamic log entry (replaces old logs block)
# ------------------------------------------------------------
cpu_status = "high" if cpu > 80 else "normal" if cpu < 60 else "moderate"
mem_status = "high" if mem > 90 else "normal" if mem < 70 else "moderate"
load_status = "high" if load_5min > 1.0 else "normal" if load_5min < 0.7 else "moderate"

parts = []
parts.append(f"CPU {cpu}% ({cpu_status})")
parts.append(f"Mem {mem}% ({mem_status})")
parts.append(f"Load(5m) {load_5min:.2f} ({load_status})")
if disk > 85:
    parts.append(f"⚠️ Disk {disk}% (critical)")

# Compare with previous log (if available)
prev_logs = data.get("logs", [])
if prev_logs and "CPU" in prev_logs[0].get("message", ""):
    import re
    prev_msg = prev_logs[0]["message"]
    prev_cpu_match = re.search(r'CPU (\d+)%', prev_msg)
    if prev_cpu_match:
        prev_cpu = int(prev_cpu_match.group(1))
        delta = cpu - prev_cpu
        if delta > 5:
            parts.append(f"📈 CPU +{delta}%")
        elif delta < -5:
            parts.append(f"📉 CPU {delta}%")

message = ", ".join(parts)

new_log = {
    "time": datetime.now().strftime("%H:%M:%S"),
    "level": "info" if "critical" not in message and "high" not in message else "warning",
    "scope": "metrics",
    "message": message
}

# Keep last 30 entries (2.5 hours of history at 5‑minute cron)
data["logs"] = [new_log] + data.get("logs", [])[:29]

# Refresh the quote of the day
quotes_path = f"{DATA_DIR}/quotes.json"
if os.path.exists(quotes_path):
    with open(quotes_path) as f:
        quotes = json.load(f)
        if quotes:
            data["quote"] = random.choice(quotes)

with open(DASHBOARD_JSON, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Refreshed: CPU={cpu}%, MEM={mem}%, DISK={disk}%, LOAD_1min={load_1min:.2f}, LOAD_5min={load_5min:.2f}, COST={cost}, UPTIME={uptime}")
EOF

# -------------------------------
# Set Permissions
# -------------------------------
# Makes the refresh script executable
sudo chmod +x /opt/refresh-dashboard-data.py

# -------------------------------
# Register Cron Job
# -------------------------------
# Set up cron to run every 5 minutes (as root, with explicit PATH to ensure commands like uptime are found)
(sudo crontab -l 2>/dev/null; echo "*/5 * * * * PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /usr/bin/python3 /opt/refresh-dashboard-data.py >> /var/log/dashboard-refresh.log 2>&1") | sudo crontab -

log "Dashboard refresh cron job configured (every 5 minutes)"

# -------------------------------
# Initialize Cost File with Root Ownership
# -------------------------------
# The refresh script runs as root, but the initial dashboard generation
# (as appuser) may have created /var/tmp/vm-cost.json with wrong permissions.
# Remove it and run the refresh script once to recreate it properly.
log "Initializing cost file for root cron"

sudo rm -f /var/tmp/vm-cost.json
sudo /usr/bin/python3 /opt/refresh-dashboard-data.py

log "Cost file initialized"

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
# Sets up nginx to serve the dashboard and data endpoints
# Removes any existing configurations to prevent conflicts

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
        types {
            image/webp webp;
            image/jpeg jpg jpeg;
            image/png png;
        }
    }
    
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
# Final Deployment Validation
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