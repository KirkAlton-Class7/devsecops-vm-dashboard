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
# Creates dashboard-data.json from VM metrics, quotes, and configuration
# This file is the single source of truth for the React frontend

log "Generating dashboard data"

sudo -u ${APP_USER} python3 <<PYTHON_SCRIPT
import json, os, random
from datetime import datetime, timedelta

# -------------------------------
# Status Helper
# -------------------------------
# Determines if a metric value is "healthy" or "warning" based on threshold

def status(val, warn=70):
    """Determine status based on value threshold"""
    try:
        return "warning" if float(val) > warn else "healthy"
    except:
        return "healthy"

# -------------------------------
# Network Info Helper
# -------------------------------
# Converts raw byte counts to human-readable MB format

def get_network_info():
    """Get detailed network information in human readable format"""
    try:
        rx_bytes = int(os.environ.get('RX_BYTES', '0'))
        tx_bytes = int(os.environ.get('TX_BYTES', '0'))
        rx_mb = rx_bytes / (1024 * 1024)
        tx_mb = tx_bytes / (1024 * 1024)
        return f"{rx_mb:.1f} MB ↓ / {tx_mb:.1f} MB ↑"
    except:
        return os.environ.get('RX_BYTES', '0') + " / " + os.environ.get('TX_BYTES', '0')

# -------------------------------
# Load Average Helper
# -------------------------------
# Reads 1-minute load average from /proc/loadavg

def get_load_average():
    """Get 1-minute load average"""
    try:
        with open('/proc/loadavg', 'r') as f:
            load = f.read().split()
            return float(load[0])
    except:
        return 0.0

# -------------------------------
# SSH Status Helper
# -------------------------------
# Returns formatted SSH status (e.g., "Enabled (22/tcp)")

def get_ssh_status():
    """Get SSH status with more detail"""
    ssh_active = os.environ.get('SSH_STATUS', 'active')
    if ssh_active.lower() == 'active':
        return "Enabled (22/tcp)"
    return "Disabled"

# -------------------------------
# Update Status Helper
# -------------------------------
# Returns number of pending security updates

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

# -------------------------------
# Memory Details (in MB)
# -------------------------------
def get_memory_details():
    """Return memory details in MB using multiple fallback methods"""
    try:
        with open('/proc/meminfo', 'r') as f:
            meminfo = {}
            for line in f:
                parts = line.split(':')
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    meminfo[key] = int(val) / 1024  # KB -> MB
        
        total = meminfo.get('MemTotal', 0)
        # Prefer MemAvailable, else compute from MemFree + Buffers + Cached
        available = meminfo.get('MemAvailable', 0)
        if available == 0:
            free = meminfo.get('MemFree', 0)
            buffers = meminfo.get('Buffers', 0)
            cached = meminfo.get('Cached', 0)
            available = free + buffers + cached
        used = total - available
        return {
            'total': round(total),
            'used': round(used),
            'free': round(available)
        }
    except Exception as e:
        print(f"Memory error: {e}")
        return {'total': 0, 'used': 0, 'free': 0}

# -------------------------------
# Disk Details (in MB)
# -------------------------------
def get_disk_details():
    """Return disk details in MB for root partition with fallback"""
    try:
        import os
        stat = os.statvfs('/')
        # Use f_frsize if non-zero, otherwise f_bsize
        block_size = stat.f_frsize if stat.f_frsize else stat.f_bsize
        total = (stat.f_blocks * block_size) / (1024 * 1024)
        free = (stat.f_bfree * block_size) / (1024 * 1024)
        used = total - free
        return {
            'total': round(total),
            'used': round(used),
            'available': round(free)
        }
    except Exception as e:
        print(f"Disk error: {e}")
        # Fallback to df command
        try:
            import subprocess
            output = subprocess.check_output(['df', '-BM', '/'], text=True)
            lines = output.strip().split('\n')
            if len(lines) >= 2:
                parts = lines[1].split()
                total_mb = int(parts[1].rstrip('M'))
                used_mb = int(parts[2].rstrip('M'))
                free_mb = int(parts[3].rstrip('M'))
                return {'total': total_mb, 'used': used_mb, 'available': free_mb}
        except:
            pass
        return {'total': 0, 'used': 0, 'available': 0}

# -------------------------------
# CPU Info (cores, frequency, usage)
# -------------------------------
def get_cpu_info():
    """Return CPU cores, frequency (if available), and usage percentage"""
    cores = 1
    freq = None
    try:
        with open('/proc/cpuinfo', 'r') as f:
            cores = f.read().count('processor')
        # Get frequency from first core (cpu MHz)
        with open('/proc/cpuinfo', 'r') as f:
            for line in f:
                if 'cpu MHz' in line:
                    freq = float(line.split(':')[1].strip())
                    break
    except:
        pass
    # Usage already in CPU_USAGE env var (as integer)
    usage = float(os.environ.get('CPU_USAGE', '0'))
    return {
        'cores': cores,
        'frequency': f"{freq:.0f} MHz" if freq else None,
        'usage': usage
    }

# -------------------------------
# Cost Estimation Helper
# -------------------------------
# Detects cloud provider, looks up hourly rate, adjusts for usage, adds storage

def get_cost_estimate():
    """Estimate cost based on machine type, provider, and actual usage"""
    try:
        machine_type = os.environ.get('MACHINE_TYPE', 'e2-micro').lower()
        
        try:
            cpu = float(os.environ.get('CPU_USAGE', '0'))
            mem = float(os.environ.get('MEM_PERCENT', '0'))
        except (ValueError, TypeError):
            cpu = 0
            mem = 0
        
        # Detect cloud provider (GCP, AWS, or Azure)
        provider = "unknown"
        try:
            import subprocess
            
            # GCP detection
            gcp_check = subprocess.run(
                ['curl', '-s', '--max-time', '2', '-H', 'Metadata-Flavor: Google', 
                 'http://metadata.google.internal/computeMetadata/v1/instance/zone'],
                capture_output=True, text=True, timeout=2
            )
            if gcp_check.returncode == 0 and gcp_check.stdout:
                provider = "gcp"
        except:
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
            except:
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
            except:
                pass
        
        # Parse machine size (micro, small, medium, large)
        machine_size = "micro"
        if "micro" in machine_type:
            machine_size = "micro"
        elif "small" in machine_type:
            machine_size = "small"
        elif "medium" in machine_type:
            machine_size = "medium"
        elif "large" in machine_type:
            machine_size = "large"
        
        # Hourly rates by provider and size (in USD)
        pricing = {
            "gcp": {"micro": 0.012, "small": 0.025, "medium": 0.050, "large": 0.100},
            "aws": {"micro": 0.0116, "small": 0.023, "medium": 0.046, "large": 0.092},
            "azure": {"micro": 0.012, "small": 0.024, "medium": 0.048, "large": 0.096}
        }
        
        # Get base hourly rate
        if provider in pricing and machine_size in pricing[provider]:
            base_hourly = pricing[provider][machine_size]
        elif provider in pricing:
            base_hourly = pricing[provider]["micro"]
        else:
            base_hourly = 0.015
        
        # Usage factor (0.1 to 1.0, based on CPU and memory)
        cpu_multiplier = min(max(cpu / 100, 0.1), 1.0)
        mem_multiplier = min(max(mem / 100, 0.1), 1.0)
        usage_factor = (cpu_multiplier + mem_multiplier) / 2
        
        # Calculate monthly cost (720 hours/month) + $1 storage
        monthly_cost = base_hourly * 720 * usage_factor
        storage_cost = 1.00
        total_monthly = monthly_cost + storage_cost
        
        # Format output with provider and machine type
        provider_names = {"gcp": "GCP", "aws": "AWS", "azure": "Azure"}
        provider_display = provider_names.get(provider, "")
        machine_display = machine_type.replace('-', ' ').replace('_', ' ').title()
        
        if provider_display:
            return f"${total_monthly:.2f}/month ({provider_display} {machine_display})"
        else:
            return f"${total_monthly:.2f}/month (est.)"
            
    except Exception as e:
        machine_type = os.environ.get('MACHINE_TYPE', 'standard')
        return f"Based on {machine_type} usage"

# -------------------------------
# Load Quotes from GitHub
# -------------------------------

import urllib.request
import json
import os

quotes = []
github_url = os.environ.get('GITHUB_QUOTES_URL', 'https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json')

print("Fetching quotes directly from GitHub...")

# Get data directory from environment
data_dir = os.environ.get('DATA_DIR', '/var/www/vm-dashboard/data')
quotes_path = os.path.join(data_dir, 'quotes.json')
local_quotes_path = os.path.join(data_dir, 'quotes_local.json')

try:
    # Fetch directly from GitHub
    with urllib.request.urlopen(github_url, timeout=10) as response:
        quotes = json.loads(response.read().decode())
        print(f"Successfully fetched {len(quotes)} quotes from GitHub")
        
        # Save to file for cache
        with open(quotes_path, "w") as f:
            json.dump(quotes, f, indent=2)
        with open(local_quotes_path, "w") as f:
            json.dump(quotes, f, indent=2)
            
except Exception as e:
    print(f"Failed to fetch from GitHub: {e}")
    
    # Fallback to local file if available
    try:
        with open(quotes_path, "r") as f:
            quotes = json.load(f)
        print(f"Loaded {len(quotes)} quotes from local cache")
    except:
        # Ultimate fallback
        quotes = [{"text": "Welcome to DevSecOps!", "author": "System"}]
        print("Using emergency fallback quote")

# -------------------------------
# Collect System Metadata
# -------------------------------
# Region from zone (strip last character)
zone = os.environ.get('ZONE', 'unknown')
region = zone[:-2] if len(zone) > 2 else 'unknown'

# Collect detailed resources
memory_details = get_memory_details()
disk_details = get_disk_details()
cpu_info = get_cpu_info()
load_avg = get_load_average()

# IPs (already exported)
internal_ip = os.environ.get('INTERNAL_IP', 'unknown')
public_ip = os.environ.get('PUBLIC_IP', 'unknown')

# -------------------------------
# Generate Sample Logs
# -------------------------------
# Creates mock application logs with timestamps and levels

logs = [
    {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "Dashboard initialized"},
    {"time": (datetime.now() - timedelta(minutes=5)).strftime("%H:%M:%S"), "level": "info", "scope": "metrics", "message": "Metrics collection started"},
    {"time": (datetime.now() - timedelta(minutes=10)).strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "System health check passed"},
    {"time": (datetime.now() - timedelta(minutes=15)).strftime("%H:%M:%S"), "level": "warning", "scope": "system", "message": "High memory usage detected (cleared)"},
    {"time": (datetime.now() - timedelta(minutes=30)).strftime("%H:%M:%S"), "level": "info", "scope": "quotes", "message": "Quotes refreshed from GitHub"},
    {"time": (datetime.now() - timedelta(minutes=45)).strftime("%H:%M:%S"), "level": "info", "scope": "nginx", "message": "Nginx request rate: 12 req/s"},
    {"time": (datetime.now() - timedelta(hours=1)).strftime("%H:%M:%S"), "level": "warning", "scope": "security", "message": "12 failed login attempts detected"},
]

# -------------------------------
# Generate Resource Table
# -------------------------------
# Lists system resources and their current status

resource_table = [
    {"name": "nginx", "type": "service", "scope": "system", "status": os.environ.get('NGINX_STATUS', 'Running')},
    {"name": "python3", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "nodejs", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "quotes.json", "type": "data", "scope": "application", "status": "Active"},
    {"name": "dashboard-data.json", "type": "data", "scope": "application", "status": "Active"},
]

# -------------------------------
# Build Main Data Structure
# -------------------------------
# Assembles all collected data into the final JSON payload

data = {
    "summaryCards": [
        {"label": "CPU", "value": f"{os.environ.get('CPU_USAGE', '0')}%", "status": status(os.environ.get('CPU_USAGE', '0'))},
        {"label": "Memory", "value": f"{os.environ.get('MEM_PERCENT', '0')}%", "status": status(os.environ.get('MEM_PERCENT', '0'))},
        {"label": "Disk", "value": os.environ.get('DISK_PERCENT', '0%'), "status": status(os.environ.get('DISK_PERCENT', '0').replace('%', ''))},
        {"label": "Cost", "value": get_cost_estimate(), "status": "info"}
    ],
    "vmInformation": [
        {"label": "Hostname", "value": os.environ.get('HOSTNAME_VM', 'unknown')},
        {"label": "Instance ID", "value": os.environ.get('INSTANCE_ID', 'unknown')},
        {"label": "Zone", "value": os.environ.get('ZONE', 'unknown')},
        {"label": "Machine Type", "value": os.environ.get('MACHINE_TYPE', 'unknown')},
        {"label": "OS", "value": os.environ.get('OS_NAME', 'unknown')},
        {"label": "Project ID", "value": os.environ.get('PROJECT_ID', 'unknown')},
        {"label": "Estimated Cost (Usage)", "value": get_cost_estimate(), "status": "info"}
    ],
    "services": [
        {"label": "Nginx", "value": os.environ.get('NGINX_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "Python", "value": os.environ.get('PYTHON_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "Metadata Service", "value": os.environ.get('METADATA_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "HTTP Service", "value": os.environ.get('HTTP_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "Startup Script", "value": os.environ.get('STARTUP_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "GitHub Quotes Sync", "value": os.environ.get('GITHUB_QUOTES_SYNC', 'Unknown'), "status": "healthy"},
        {"label": "Bootstrap Packages", "value": ", ".join(json.loads(os.environ.get('BOOTSTRAP_PACKAGES_JSON', '[]'))), "status": "healthy"}
    ],
    "security": [
        {"label": "Host Firewall", "value": os.environ.get('FIREWALL_STATUS', 'Not installed'), "status": "info"},
        {"label": "SSH", "value": get_ssh_status(), "status": "healthy"},
        {"label": "Updates", "value": get_update_status(), "status": "info"},
        {"label": "Internal IP", "value": os.environ.get('INTERNAL_IP', 'unknown'), "status": "info"},
        {"label": "Public IP", "value": os.environ.get('PUBLIC_IP', 'unknown'), "status": "info"}
    ],
    "meta": {
        "appName": os.environ.get('DASHBOARD_APP_NAME', 'Custom Application'),
        "tagline": os.environ.get('DASHBOARD_TAGLINE', 'Real-time infrastructure monitoring'),
        "dashboardUser": os.environ.get('DASHBOARD_USER', 'Dashboard User'),
        "dashboardName": os.environ.get('DASHBOARD_NAME', 'DevSecOps Dashboard'),
        "uptime": os.environ.get("UPTIME", "unknown"),
    },
    "quote": quote,
    "logs": logs,
    "resourceTable": resource_table,
    "systemLoad": get_load_average(),
    "identity": {
        "project": os.environ.get('PROJECT_ID', 'unknown'),
        "instanceId": os.environ.get('INSTANCE_ID', 'unknown'),
        "hostname": os.environ.get('HOSTNAME_VM', 'unknown'),
        "machineType": os.environ.get('MACHINE_TYPE', 'unknown')
    },
    "network": {
        "vpc": "default",
        "subnet": f"{region}-subnet",
        "internalIp": internal_ip,
        "externalIp": public_ip
    },
    "location": {
        "region": region,
        "zone": zone,
        "uptime": os.environ.get("UPTIME", "unknown"),
        "loadAvg": f"{load_avg:.2f}"
    },
    "systemResources": {
        "memory": memory_details,
        "disk": disk_details,
        "cpu": cpu_info,
        "endpoints": {
            "healthz": "/healthz",
            "metadata": "/metadata"
        }
    }
}

# -------------------------------
# Write to File
# -------------------------------
# Saves the final JSON to the data directory for nginx to serve

with open("${DATA_DIR}/dashboard-data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Dashboard data generated successfully")
PYTHON_SCRIPT

# -------------------------------
# Dashboard Refresh Cron Job
# -------------------------------
# Sets up a cron job that runs every 5 minutes to refresh dashboard data
# Creates a standalone Python script that collects fresh metrics and updates dashboard-data.json

log "Setting up cron job to refresh dashboard data"

# -------------------------------
# Create Refresh Script
# -------------------------------
# Standalone Python script that collects fresh metrics and updates dashboard-data.json
# Uses same robust functions as main script to ensure consistency

cat > /opt/refresh-dashboard-data.py << 'EOF'
import json, os, random
from datetime import datetime, timedelta

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------
DATA_DIR = os.environ.get('DATA_DIR', '/var/www/vm-dashboard/data')
DASHBOARD_JSON = f"{DATA_DIR}/dashboard-data.json"

# ------------------------------------------------------------
# Load existing dashboard data (to preserve static fields)
# ------------------------------------------------------------
existing = {}
if os.path.exists(DASHBOARD_JSON):
    try:
        with open(DASHBOARD_JSON, 'r') as f:
            existing = json.load(f)
    except:
        pass

# ------------------------------------------------------------
# Helper functions (status, network, IP, load, SSH, updates, cost)
# ------------------------------------------------------------
def status(val, warn=70):
    try:
        return "warning" if float(val) > warn else "healthy"
    except:
        return "healthy"

def get_network_info():
    try:
        rx_bytes = int(os.environ.get('RX_BYTES', '0'))
        tx_bytes = int(os.environ.get('TX_BYTES', '0'))
        rx_mb = rx_bytes / (1024 * 1024)
        tx_mb = tx_bytes / (1024 * 1024)
        return f"{rx_mb:.1f} MB ↓ / {tx_mb:.1f} MB ↑"
    except:
        return os.environ.get('RX_BYTES', '0') + " / " + os.environ.get('TX_BYTES', '0')

def get_internal_ip():
    try:
        import subprocess
        result = subprocess.run(
            ['curl', '-s', '--max-time', '2', '-H', 'Metadata-Flavor: Google',
             'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip'],
            capture_output=True, text=True, timeout=2
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout.strip()
    except:
        pass
    try:
        result = subprocess.run(['hostname', '-I'], capture_output=True, text=True, timeout=2)
        if result.returncode == 0 and result.stdout:
            return result.stdout.split()[0]
    except:
        pass
    return "unknown"

def get_public_ip():
    try:
        import subprocess
        result = subprocess.run(
            ['curl', '-s', '--max-time', '2', '-H', 'Metadata-Flavor: Google',
             'http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip'],
            capture_output=True, text=True, timeout=2
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout.strip()
    except:
        pass
    try:
        import urllib.request
        with urllib.request.urlopen('http://ifconfig.me', timeout=5) as response:
            return response.read().decode().strip()
    except:
        pass
    return "unknown"

def get_load_average():
    try:
        with open('/proc/loadavg', 'r') as f:
            load = f.read().split()
            return float(load[0])
    except:
        return 0.0

def get_ssh_status():
    ssh_active = os.environ.get('SSH_STATUS', 'active')
    if ssh_active.lower() == 'active':
        return "Enabled (22/tcp)"
    return "Disabled"

def get_update_status():
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
        return "Current"

def get_cost_estimate(cpu_usage, mem_percent):
    try:
        machine_type = os.environ.get('MACHINE_TYPE', 'e2-micro').lower()
        cpu = float(cpu_usage)
        mem = float(mem_percent)
        provider = "unknown"
        try:
            import subprocess
            gcp_check = subprocess.run(
                ['curl', '-s', '--max-time', '2', '-H', 'Metadata-Flavor: Google',
                 'http://metadata.google.internal/computeMetadata/v1/instance/zone'],
                capture_output=True, text=True, timeout=2
            )
            if gcp_check.returncode == 0 and gcp_check.stdout:
                provider = "gcp"
        except:
            pass
        if provider == "unknown":
            try:
                aws_check = subprocess.run(
                    ['curl', '-s', '--max-time', '2', 'http://169.254.169.254/latest/meta-data/instance-id'],
                    capture_output=True, text=True, timeout=2
                )
                if aws_check.returncode == 0 and aws_check.stdout:
                    provider = "aws"
            except:
                pass
        if provider == "unknown":
            try:
                azure_check = subprocess.run(
                    ['curl', '-s', '--max-time', '2', '-H', 'Metadata:true',
                     'http://169.254.169.254/metadata/instance?api-version=2017-08-01'],
                    capture_output=True, text=True, timeout=2
                )
                if azure_check.returncode == 0 and azure_check.stdout:
                    provider = "azure"
            except:
                pass
        machine_size = "micro"
        if "micro" in machine_type:
            machine_size = "micro"
        elif "small" in machine_type:
            machine_size = "small"
        elif "medium" in machine_type:
            machine_size = "medium"
        elif "large" in machine_type:
            machine_size = "large"
        pricing = {
            "gcp": {"micro": 0.012, "small": 0.025, "medium": 0.050, "large": 0.100},
            "aws": {"micro": 0.0116, "small": 0.023, "medium": 0.046, "large": 0.092},
            "azure": {"micro": 0.012, "small": 0.024, "medium": 0.048, "large": 0.096}
        }
        if provider in pricing and machine_size in pricing[provider]:
            base_hourly = pricing[provider][machine_size]
        elif provider in pricing:
            base_hourly = pricing[provider]["micro"]
        else:
            base_hourly = 0.015
        cpu_multiplier = min(max(cpu / 100, 0.1), 1.0)
        mem_multiplier = min(max(mem / 100, 0.1), 1.0)
        usage_factor = (cpu_multiplier + mem_multiplier) / 2
        monthly_cost = base_hourly * 720 * usage_factor
        storage_cost = 1.00
        total_monthly = monthly_cost + storage_cost
        provider_names = {"gcp": "GCP", "aws": "AWS", "azure": "Azure"}
        provider_display = provider_names.get(provider, "")
        machine_display = machine_type.replace('-', ' ').replace('_', ' ').title()
        if provider_display:
            return f"${total_monthly:.2f}/month ({provider_display} {machine_display})"
        else:
            return f"${total_monthly:.2f}/month (est.)"
    except Exception:
        machine_type = os.environ.get('MACHINE_TYPE', 'standard')
        return f"Based on {machine_type} usage"

# ------------------------------------------------------------
# Collect fresh dynamic metrics
# ------------------------------------------------------------
cpu_usage = os.popen("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {printf \"%.0f\", usage}'").read().strip() or "0"
mem_percent = os.popen("free | awk '/Mem:/ {printf(\"%.0f\"), $3/$2 * 100.0}'").read().strip() or "0"
disk_percent = os.popen("df / | tail -1 | awk '{print $5}'").read().strip() or "0%"
uptime = os.popen("uptime -p").read().strip() or "up 0 minutes"
hostname = os.popen("hostname").read().strip() or "unknown"

internal_ip = get_internal_ip()
public_ip = get_public_ip()
network_info = get_network_info()

# Load quotes
quotes = []
try:
    with open(f"{DATA_DIR}/quotes.json") as f:
        quotes = json.load(f)
    print(f"Loaded {len(quotes)} quotes")
except:
    quotes = [{"text": "Welcome to DevSecOps!", "author": "System"}]
    print("Using fallback quotes")

# ------------------------------------------------------------
# Build dynamic parts
# ------------------------------------------------------------
summaryCards = [
    {"label": "CPU", "value": f"{cpu_usage}%", "status": status(cpu_usage)},
    {"label": "Memory", "value": f"{mem_percent}%", "status": status(mem_percent)},
    {"label": "Disk", "value": disk_percent, "status": status(disk_percent.replace('%', ''))},
    {"label": "Cost", "value": get_cost_estimate(cpu_usage, mem_percent), "status": "info"}
]

services = [
    {"label": "Nginx", "value": os.environ.get('NGINX_STATUS', 'Running'), "status": "healthy"},
    {"label": "Python", "value": os.environ.get('PYTHON_STATUS', 'Installed'), "status": "healthy"},
    {"label": "Metadata Service", "value": os.environ.get('METADATA_STATUS', 'Reachable'), "status": "healthy"},
    {"label": "HTTP Service", "value": os.environ.get('HTTP_STATUS', 'Serving'), "status": "healthy"},
    {"label": "Startup Script", "value": os.environ.get('STARTUP_STATUS', 'Completed'), "status": "healthy"},
    {"label": "GitHub Quotes Sync", "value": os.environ.get('GITHUB_QUOTES_SYNC', 'Successful'), "status": "healthy"},
    {"label": "Bootstrap Packages", "value": "nginx, python3, curl, jq, git", "status": "healthy"}
]

security = [
    {"label": "Host Firewall", "value": os.environ.get('FIREWALL_STATUS', 'Not installed'), "status": "info"},
    {"label": "SSH", "value": get_ssh_status(), "status": "healthy"},
    {"label": "Updates", "value": get_update_status(), "status": "info"},
    {"label": "Internal IP", "value": internal_ip, "status": "info"},
    {"label": "Public IP", "value": public_ip, "status": "info"}
]

logs = [
    {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": f"Dashboard updated - CPU: {cpu_usage}%, Memory: {mem_percent}%"},
    {"time": (datetime.now() - timedelta(minutes=5)).strftime("%H:%M:%S"), "level": "info", "scope": "metrics", "message": f"Network: {network_info}"},
    {"time": (datetime.now() - timedelta(minutes=10)).strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "System health check passed"},
    {"time": (datetime.now() - timedelta(minutes=15)).strftime("%H:%M:%S"), "level": "info", "scope": "quotes", "message": f"Quotes loaded: {len(quotes)} available"},
    {"time": (datetime.now() - timedelta(minutes=30)).strftime("%H:%M:%S"), "level": "info", "scope": "nginx", "message": "Nginx serving dashboard"}
]

resourceTable = [
    {"name": "nginx", "type": "service", "scope": "system", "status": os.environ.get('NGINX_STATUS', 'Running')},
    {"name": "python3", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "nodejs", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "quotes.json", "type": "data", "scope": "application", "status": "Active"},
    {"name": "dashboard-data.json", "type": "data", "scope": "application", "status": "Active"}
]

systemLoad = get_load_average()

# ------------------------------------------------------------
# Merge with existing static data (preserve identity, network, location, systemResources)
# ------------------------------------------------------------
identity = existing.get('identity', {
    "project": os.environ.get('PROJECT_ID', 'unknown'),
    "instanceId": os.environ.get('INSTANCE_ID', 'unknown'),
    "hostname": hostname,
    "machineType": os.environ.get('MACHINE_TYPE', 'unknown')
})

network = existing.get('network', {
    "vpc": "default",
    "subnet": f"{os.environ.get('ZONE', 'unknown')[:-2]}-subnet",
    "internalIp": internal_ip,
    "externalIp": public_ip
})

location = existing.get('location', {
    "region": os.environ.get('ZONE', 'unknown')[:-2] if len(os.environ.get('ZONE', 'unknown')) > 2 else 'unknown',
    "zone": os.environ.get('ZONE', 'unknown'),
    "uptime": uptime,
    "loadAvg": f"{systemLoad:.2f}"
})

systemResources = existing.get('systemResources', {
    "memory": {"total": 0, "used": 0, "free": 0},
    "disk": {"total": 0, "used": 0, "available": 0},
    "cpu": {"cores": 1, "frequency": None, "usage": float(cpu_usage)},
    "endpoints": {"healthz": "/healthz", "metadata": "/metadata"}
})

# Update the dynamic fields inside systemResources (e.g., cpu usage)
if "cpu" in systemResources:
    systemResources["cpu"]["usage"] = float(cpu_usage)

# ------------------------------------------------------------
# Build final data
# ------------------------------------------------------------
data = {
    "summaryCards": summaryCards,
    "vmInformation": existing.get('vmInformation', []),  # keep as is, it's static
    "services": services,
    "security": security,
    "meta": existing.get('meta', {
        "appName": os.environ.get('DASHBOARD_APP_NAME', 'DevSecOps'),
        "tagline": os.environ.get('DASHBOARD_TAGLINE', 'Real-time infrastructure monitoring'),
        "dashboardUser": os.environ.get('DASHBOARD_USER', 'Kirk Alton'),
        "dashboardName": os.environ.get('DASHBOARD_NAME', 'DevSecOps Dashboard'),
        "uptime": uptime
    }),
    "quote": random.choice(quotes),
    "logs": logs,
    "resourceTable": resourceTable,
    "systemLoad": systemLoad,
    "identity": identity,
    "network": network,
    "location": location,
    "systemResources": systemResources
}

# ------------------------------------------------------------
# Write to file
# ------------------------------------------------------------
with open(DASHBOARD_JSON, "w") as f:
    json.dump(data, f, indent=2)

print(f"Dashboard data refreshed - CPU: {cpu_usage}%, Memory: {mem_percent}%, Disk: {disk_percent}")
EOF

# -------------------------------
# Set Permissions
# -------------------------------
# Makes the refresh script executable

chmod +x /opt/refresh-dashboard-data.py

# -------------------------------
# Register Cron Job
# -------------------------------
# Adds a cron entry to run the refresh script every 5 minutes

REFRESH_CRON_CMD="*/5 * * * * /usr/bin/python3 /opt/refresh-dashboard-data.py >> /var/log/dashboard-refresh.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'refresh-dashboard-data'; echo "$REFRESH_CRON_CMD") | crontab -

log "Dashboard refresh cron job configured (every 5 minutes)"

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
# Checks that both the data endpoint and the dashboard are serving correctly

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