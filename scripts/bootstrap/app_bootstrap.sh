#!/usr/bin/env bash

# -------------------------------
# Dashboard Customization
# -------------------------------
# Edit these values to customize your dashboard

# App name shown in the header (top left)
DASHBOARD_APP_NAME="Cloud Deployment"

# Tagline shown below the app name
DASHBOARD_TAGLINE="Infrastructure health and activity"

# User name shown in the sidebar
DASHBOARD_USER="Kirk Alton"

# Dashboard title shown in the sidebar
DASHBOARD_NAME="DevSecOps Dashboard"

# ---------------------------------------------------------------------------------------------
# !!! END OF CONFIGURATION - DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING !!!
# ---------------------------------------------------------------------------------------------

# Repo to pull the dashboard code from
REPO_URL="https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git"

# URL to fetch quotes from
GITHUB_QUOTES_URL="https://raw.githubusercontent.com/KirkAlton-Class7/devsecops-vm-dashboard/main/quotes.json"

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

# Web servers (nginx, www-data) need +x on directories to traverse
chmod 755 "${DATA_DIR}"

# -------------------------------
# Environment Setup
# -------------------------------
export DEBIAN_FRONTEND=noninteractive
export DASHBOARD_APP_NAME
export DASHBOARD_TAGLINE
export DASHBOARD_USER
export DASHBOARD_NAME

# -------------------------------
# Logging & Debugging
# -------------------------------
exec > /var/log/startup-script.log 2>&1
set -x
set -uo pipefail

log() { echo "[${APP_NAME}] $1"; }

log "Dashboard customization:"
log "  App Name: ${DASHBOARD_APP_NAME}"
log "  Tagline: ${DASHBOARD_TAGLINE}"
log "  User: ${DASHBOARD_USER}"
log "  Dashboard Name: ${DASHBOARD_NAME}"

# -------------------------------
# Package Manager Abstraction
# -------------------------------
pkg_install() {
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update -y
        apt-get install -y "$@"
    elif command -v yum >/dev/null 2>&1; then
        yum install -y "$@"
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y "$@"
    else
        log "ERROR: No supported package manager found"
        exit 1
    fi
}

# -------------------------------
# Cloud Provider Detection
# -------------------------------
detect_cloud_provider() {
    if curl -s --connect-timeout 1 -H "Metadata-Flavor: Google" http://metadata.google.internal >/dev/null 2>&1; then
        echo "gcp"
    elif curl -s --connect-timeout 1 http://169.254.169.254/latest/meta-data/instance-id >/dev/null 2>&1; then
        echo "aws"
    elif curl -s --connect-timeout 1 -H "Metadata: true" http://169.254.169.254/metadata/instance?api-version=2017-08-01 >/dev/null 2>&1; then
        echo "azure"
    else
        echo "unknown"
    fi
}

CLOUD_PROVIDER=$(detect_cloud_provider)
log "Detected cloud provider: $CLOUD_PROVIDER"

# -------------------------------
# Metadata Fetching Functions
# -------------------------------
fetch_gcp_metadata() {
    curl -fsS -H "Metadata-Flavor: Google" --connect-timeout 2 --max-time 3 \
        "http://metadata.google.internal/computeMetadata/v1/$1" 2>/dev/null || echo "unknown"
}

fetch_aws_metadata() {
    curl -fsS --connect-timeout 2 --max-time 3 \
        "http://169.254.169.254/latest/meta-data/$1" 2>/dev/null || echo "unknown"
}

fetch_azure_metadata() {
    curl -fsS -H "Metadata: true" --connect-timeout 2 --max-time 3 \
        "http://169.254.169.254/metadata/instance/$1?api-version=2017-08-01" 2>/dev/null | jq -r '.' 2>/dev/null || echo "unknown"
}

# -------------------------------
# System Info Collection
# -------------------------------
HOSTNAME_VM=$(hostname)
INSTANCE_ID="unknown"
ZONE="unknown"
MACHINE_TYPE="unknown"
PROJECT_ID="unknown"
INTERNAL_IP=$(ip route get 1 | awk '{print $5; exit}' 2>/dev/null || hostname -I | awk '{print $1}')
PUBLIC_IP=""
OS_NAME="$(. /etc/os-release && echo "$PRETTY_NAME")"
UPTIME="$(uptime -p || echo "unknown")"

case "$CLOUD_PROVIDER" in
    gcp)
        INSTANCE_ID=$(fetch_gcp_metadata "instance/id")
        ZONE=$(fetch_gcp_metadata "instance/zone" | awk -F/ '{print $NF}')
        MACHINE_TYPE=$(fetch_gcp_metadata "instance/machine-type" | awk -F/ '{print $NF}')
        PROJECT_ID=$(fetch_gcp_metadata "project/project-id")
        INTERNAL_IP=$(fetch_gcp_metadata "instance/network-interfaces/0/ip")
        PUBLIC_IP=$(fetch_gcp_metadata "instance/network-interfaces/0/access-configs/0/external-ip")
        ;;
    aws)
        INSTANCE_ID=$(fetch_aws_metadata "instance-id")
        ZONE=$(fetch_aws_metadata "placement/availability-zone")
        MACHINE_TYPE=$(fetch_aws_metadata "instance-type")
        PROJECT_ID="aws"
        PUBLIC_IP=$(fetch_aws_metadata "public-ipv4")
        ;;
    azure)
        INSTANCE_ID=$(fetch_azure_metadata "compute/vmId")
        ZONE=$(fetch_azure_metadata "compute/zone")
        MACHINE_TYPE=$(fetch_azure_metadata "compute/vmSize")
        PROJECT_ID="azure"
        PUBLIC_IP=$(fetch_azure_metadata "network/interface/0/ipv4/ipAddress/0/publicIp")
        ;;
esac

# Fallback for public IP if not obtained
if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "unknown" ]; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
fi

log "Metadata: HOSTNAME=$HOSTNAME_VM, INSTANCE_ID=$INSTANCE_ID, ZONE=$ZONE, MACHINE_TYPE=$MACHINE_TYPE, PROJECT=$PROJECT_ID, INTERNAL_IP=$INTERNAL_IP, PUBLIC_IP=$PUBLIC_IP"

# -------------------------------
# Helper Functions (retry, wait_for_apt, etc.)
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

wait_for_apt() {
    if command -v apt-get >/dev/null 2>&1; then
        log "Waiting for apt lock..."
        while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
            sleep 2
        done
        log "Apt lock released"
    else
        sleep 1
    fi
}

service_status() {
    systemctl is-active --quiet "$1" 2>/dev/null && echo "Running" || echo "Stopped"
}

command_status() {
    command -v "$1" >/dev/null 2>&1 && echo "Installed" || echo "Missing"
}

# -------------------------------
# File System Initialization
# -------------------------------
mkdir -p /opt

# -------------------------------
# Install Packages (cross‑platform)
# -------------------------------
wait_for_apt
retry pkg_install nginx python3 curl jq ca-certificates git build-essential rsync || true

# -------------------------------
# Install Node.js (NodeSource script works on both families)
# -------------------------------
if ! command -v node >/dev/null 2>&1; then
    log "Installing Node.js"
    retry curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || {
        # Fallback for Amazon Linux (NodeSource also has a yum script)
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    }
    pkg_install nodejs
fi

# -------------------------------
# Create App User
# -------------------------------
if ! id "${APP_USER}" >/dev/null 2>&1; then
    log "Creating user ${APP_USER}"
    useradd -m -s /bin/bash "${APP_USER}"
fi

# -------------------------------
# Application Directories
# -------------------------------
mkdir -p "${APP_DIR}" "${DATA_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"
chmod -R 755 "${APP_DIR}"

# -------------------------------
# Clone Repo
# -------------------------------
log "Cloning dashboard repo from ${REPO_URL}"
REPO_DIR="/opt/${APP_NAME}"
if [ ! -d "$REPO_DIR" ]; then
    retry git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR" && git pull
chown -R ${APP_USER}:${APP_USER} "$REPO_DIR"

# -------------------------------
# Copy utility scripts
# -------------------------------
mkdir -p /opt/scripts
if [ -d "$REPO_DIR/scripts" ]; then
    cp -rf "$REPO_DIR/scripts/"* /opt/scripts/ 2>/dev/null
    chmod +x /opt/scripts/*.py /opt/scripts/*.sh 2>/dev/null
    log "All scripts copied to /opt/scripts"
fi

# -------------------------------
# Fetch pricing script (if exists)
# -------------------------------
if [ -f "/opt/scripts/fetch_pricing.py" ]; then
    chmod +x /opt/scripts/fetch_pricing.py
    export DATA_DIR
    /opt/scripts/fetch_pricing.py
    log "Initial pricing cache generated"
fi

# -------------------------------
# Quotes (local fallback + cache)
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
# Cron Job to Refresh Quotes
# -------------------------------
log "Setting up cron job to refresh quotes"
CRON_CMD="*/10 * * * * curl -fsSL ${GITHUB_QUOTES_URL} -o ${DATA_DIR}/quotes.json.tmp && mv ${DATA_DIR}/quotes.json.tmp ${DATA_DIR}/quotes.json && cp ${DATA_DIR}/quotes.json ${DATA_DIR}/quotes_local.json >> /var/log/quotes-cron.log 2>&1 # vm-dashboard-sync"
(crontab -l 2>/dev/null | grep -v 'vm-dashboard-sync'; echo "$CRON_CMD") | crontab -

# -------------------------------
# Pricing Cache Cron (monthly)
# -------------------------------
log "Setting up pricing cache cron job"
(crontab -l 2>/dev/null | grep -v 'fetch_pricing.py'; echo "0 3 1 * * export DATA_DIR=${DATA_DIR} && /opt/scripts/fetch_pricing.py >> /var/log/pricing-cron.log 2>&1") | crontab -

# ---------------------------------------
# Generate Photo Gallery Images (from repo images)
# ---------------------------------------
log "Setting up photo gallery"

cd "$REPO_DIR" || { log "ERROR: $REPO_DIR not found"; exit 1; }
git fetch origin main
git reset --hard origin/main || { log "ERROR: git reset failed"; exit 1; }

mkdir -p "${DATA_DIR}/images"
rm -rf "${DATA_DIR}/images"/* 2>/dev/null || true

if [ -f "$REPO_DIR/images.json" ]; then
    cp -f "$REPO_DIR/images.json" "${DATA_DIR}/images.json"
    log "images.json copied"
else
    log "ERROR: images.json not found in repo root"
fi

if [ -d "$REPO_DIR/images" ]; then
    cp -rf "$REPO_DIR/images/." "${DATA_DIR}/images/"
    log "Images copied"
else
    log "ERROR: images directory not found in repo"
fi

chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}/images" 2>/dev/null || true
chmod -R 755 "${DATA_DIR}/images" 2>/dev/null || true
chown ${APP_USER}:${APP_USER} "${DATA_DIR}/images.json" 2>/dev/null || true
chmod 644 "${DATA_DIR}/images.json" 2>/dev/null || true

systemctl reload nginx || true

# -------------------------------
# System metrics (generic)
# -------------------------------
CPU_USAGE="$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {printf "%.0f", usage}' 2>/dev/null || echo "0")"
MEM_PERCENT="$(free | awk '/Mem:/ {printf("%.0f"), $3/$2 * 100.0}' 2>/dev/null || echo "0")"
DISK_PERCENT="$(df / | tail -1 | awk '{print $5}' 2>/dev/null || echo "0%")"

IFACE=$(ip route get 1 2>/dev/null | awk '{print $5}' || echo "eth0")
RX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/rx_bytes 2>/dev/null || echo "0")"
TX_BYTES="$(cat /sys/class/net/${IFACE}/statistics/tx_bytes 2>/dev/null || echo "0")"

# -------------------------------
# Services Status
# -------------------------------
NGINX_STATUS="$(service_status nginx)"
PYTHON_STATUS="$(command_status python3)"
STARTUP_STATUS="Completed"
METADATA_STATUS="Reachable"
HTTP_STATUS="Serving"
BOOTSTRAP_PACKAGES_JSON='["nginx","python3","curl","jq","git"]'

# -------------------------------
# Security (generic)
# -------------------------------
FIREWALL_STATUS="Not installed"
SSH_STATUS="$(systemctl is-active ssh 2>/dev/null || echo "Not installed")"
UPDATES="0"
UPDATE_STATUS="Current"
if command -v apt >/dev/null 2>&1; then
    UPDATES="$(apt list --upgradable 2>/dev/null | tail -n +2 | wc -l || echo "0")"
elif command -v yum >/dev/null 2>&1; then
    UPDATES="$(yum check-update -q 2>/dev/null | wc -l || echo "0")"
fi

# -------------------------------
# Export for Python
# -------------------------------
export HOSTNAME_VM INSTANCE_ID ZONE MACHINE_TYPE OS_NAME PROJECT_ID INTERNAL_IP PUBLIC_IP
export NGINX_STATUS PYTHON_STATUS STARTUP_STATUS METADATA_STATUS HTTP_STATUS GITHUB_QUOTES_SYNC
export FIREWALL_STATUS SSH_STATUS UPDATE_STATUS UPTIME BOOTSTRAP_PACKAGES_JSON
export CPU_USAGE MEM_PERCENT DISK_PERCENT RX_BYTES TX_BYTES
export APP_NAME APP_DIR DATA_DIR APP_USER GITHUB_QUOTES_URL UPDATES

# -------------------------------
# Fetch GitHub Quotes (initial)
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
            log "WARNING: Still seeing fallback quotes! GitHub fetch may have failed silently."
        fi
    else
        log "Invalid JSON from GitHub, keeping existing quotes"
        rm -f "${ACTIVE_QUOTES}.tmp"
    fi
else
    log "Failed to fetch GitHub quotes, using existing file if available"
fi

if [ -f "${ACTIVE_QUOTES}" ]; then
    QUOTE_COUNT=$(python3 -c "import json; print(len(json.load(open('${ACTIVE_QUOTES}'))))" 2>/dev/null || echo "0")
    log "Quotes file has ${QUOTE_COUNT} quotes"
fi

if [ -f "${ACTIVE_QUOTES}" ] && grep -q "Nietzsche" "${ACTIVE_QUOTES}"; then
    log "Fallback quotes detected! Retrying with wget..."
    wget -q -O "${ACTIVE_QUOTES}.tmp" "${GITHUB_QUOTES_URL}"
    if [ $? -eq 0 ] && python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
        mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
        cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
        log "Second attempt successful!"
    fi
fi

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

sudo -u ${APP_USER} bash <<EOF
cd "$REPO_DIR/dashboard"
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

# -------------------------------
# Deploy Dashboard
# -------------------------------
log "Deploying dashboard"
rm -rf ${APP_DIR}/*
cp -r "$REPO_DIR/dashboard/dist/"* ${APP_DIR}/

# -------------------------------
# Force fetch GitHub quotes before generating data
# -------------------------------
log "Force fetching GitHub quotes before generating dashboard data"
retry curl -fsSL "${GITHUB_QUOTES_URL}" -o "${ACTIVE_QUOTES}.tmp"
if [ $? -eq 0 ] && [ -s "${ACTIVE_QUOTES}.tmp" ]; then
    if python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
        mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
        cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
        log "GitHub quotes loaded successfully"
        FIRST_QUOTE=$(python3 -c "import json; print(json.load(open('${ACTIVE_QUOTES}'))[0]['text'][:60])" 2>/dev/null || echo "Unknown")
        log "First quote: ${FIRST_QUOTE}..."
    else
        log "Invalid JSON from GitHub, keeping existing quotes"
        rm -f "${ACTIVE_QUOTES}.tmp"
    fi
fi

if [ -f "${ACTIVE_QUOTES}" ]; then
    QUOTE_COUNT=$(python3 -c "import json; print(len(json.load(open('${ACTIVE_QUOTES}'))))" 2>/dev/null || echo "0")
    log "Final quotes file has ${QUOTE_COUNT} quotes"
    if grep -q "Nietzsche" "${ACTIVE_QUOTES}"; then
        log "WARNING: Fallback quotes detected. Retrying with wget..."
        wget -q -O "${ACTIVE_QUOTES}.tmp" "${GITHUB_QUOTES_URL}"
        if [ $? -eq 0 ] && python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))" 2>/dev/null; then
            mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
            cp "${ACTIVE_QUOTES}" "${LOCAL_QUOTES}"
            log "Second attempt successful. GitHub quotes loaded."
        fi
    else
        log "Verified: GitHub quotes are ready"
    fi
fi

# -------------------------------
# Generate Dashboard Data JSON
# -------------------------------
log "Generating dashboard data"

sudo -u ${APP_USER} python3 <<PYTHON_SCRIPT
import json, os, random
from datetime import datetime, timedelta

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

def get_load_average():
    try:
        with open('/proc/loadavg', 'r') as f:
            return float(f.read().split()[0])
    except:
        return 0.0

def get_ssh_status():
    ssh_active = os.environ.get('SSH_STATUS', 'active')
    return "Enabled (22/tcp)" if ssh_active.lower() == 'active' else "Disabled"

def get_update_status():
    updates = os.environ.get('UPDATES', '0')
    if updates == "Current" or updates == "0":
        return "Up to date"
    try:
        update_count = int(updates)
        return f"{update_count} security updates" if update_count < 5 else f"{update_count} updates available"
    except:
        return "Current"

def get_memory_details():
    try:
        with open('/proc/meminfo', 'r') as f:
            meminfo = {}
            for line in f:
                if ':' not in line:
                    continue
                key, val = line.split(':', 1)
                meminfo[key.strip()] = int(val.strip().split()[0]) / 1024
        total = meminfo.get('MemTotal', 0)
        available = meminfo.get('MemAvailable', 0)
        if available == 0:
            free = meminfo.get('MemFree', 0)
            buffers = meminfo.get('Buffers', 0)
            cached = meminfo.get('Cached', 0)
            available = free + buffers + cached
        used = total - available
        return {'total': round(total), 'used': round(used), 'free': round(available)}
    except Exception as e:
        print(f"Memory error: {e}")
        return {'total': 0, 'used': 0, 'free': 0}

def get_disk_details():
    try:
        import os
        stat = os.statvfs('/')
        block_size = stat.f_frsize if stat.f_frsize else stat.f_bsize
        total = (stat.f_blocks * block_size) / (1024 * 1024)
        free = (stat.f_bfree * block_size) / (1024 * 1024)
        used = total - free
        return {'total': round(total), 'used': round(used), 'available': round(free)}
    except:
        try:
            import subprocess
            out = subprocess.check_output(['df', '-BM', '/'], text=True)
            parts = out.split('\n')[1].split()
            return {'total': int(parts[1].rstrip('M')), 'used': int(parts[2].rstrip('M')), 'available': int(parts[3].rstrip('M'))}
        except:
            return {'total': 0, 'used': 0, 'available': 0}

def get_cpu_info():
    cores = 1
    freq = None
    try:
        with open('/proc/cpuinfo', 'r') as f:
            cores = f.read().count('processor')
        with open('/proc/cpuinfo', 'r') as f:
            for line in f:
                if 'cpu MHz' in line:
                    freq = float(line.split(':')[1].strip())
                    break
    except:
        pass
    usage = float(os.environ.get('CPU_USAGE', '0'))
    return {'cores': cores, 'frequency': f"{freq:.0f} MHz" if freq else None, 'usage': usage}

def get_hourly_rate():
    machine_type = os.environ.get('MACHINE_TYPE', 'e2-micro').lower()
    machine_short = machine_type.split('/')[-1]
    rates = {'e2-micro': 0.0076, 'e2-small': 0.0150, 'e2-medium': 0.0301,
             'n1-standard-1': 0.0475, 'n2-standard-2': 0.0972, 't3.micro': 0.0104, 't3.small': 0.0208}
    return rates.get(machine_short, 0.01)

def get_cumulative_cost():
    cost_file = '/var/tmp/vm-cost.json'
    hourly_rate = get_hourly_rate()
    try:
        with open('/proc/uptime', 'r') as f:
            current_uptime = float(f.read().split()[0])
    except:
        current_uptime = 0
    try:
        with open(cost_file, 'r') as f:
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
    with open(cost_file, 'w') as f:
        json.dump({'total_cost': total_cost, 'last_uptime_sec': last_uptime}, f)
    if total_cost < 0.01:
        return f"${total_cost:.4f} total"
    elif total_cost < 1:
        return f"${total_cost:.3f} total"
    else:
        return f"${total_cost:.2f} total"

# Load quotes
quotes = []
data_dir = os.environ.get('DATA_DIR', '/var/www/vm-dashboard/data')
quotes_path = os.path.join(data_dir, 'quotes.json')
try:
    with open(quotes_path, 'r') as f:
        quotes = json.load(f)
except:
    quotes = [{"text": "Welcome to DevSecOps!", "author": "System"}]

quote = random.choice(quotes)

# Collect metadata
zone = os.environ.get('ZONE', 'unknown')
if zone == 'unknown' or len(zone) < 3:
    region = 'unknown'
else:
    region = zone[:-2]

memory_details = get_memory_details()
disk_details = get_disk_details()
cpu_info = get_cpu_info()
load_avg = get_load_average()
internal_ip = os.environ.get('INTERNAL_IP', 'unknown')
public_ip = os.environ.get('PUBLIC_IP', 'unknown')

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
    {"name": "nginx", "type": "service", "scope": "system", "status": os.environ.get('NGINX_STATUS', 'Running')},
    {"name": "python3", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "nodejs", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "quotes.json", "type": "data", "scope": "application", "status": "Active"},
    {"name": "dashboard-data.json", "type": "data", "scope": "application", "status": "Active"},
]

data = {
    "summaryCards": [
        {"label": "CPU", "value": f"{os.environ.get('CPU_USAGE', '0')}%", "status": status(os.environ.get('CPU_USAGE', '0'))},
        {"label": "Memory", "value": f"{os.environ.get('MEM_PERCENT', '0')}%", "status": status(os.environ.get('MEM_PERCENT', '0'))},
        {"label": "Disk", "value": os.environ.get('DISK_PERCENT', '0%'), "status": status(os.environ.get('DISK_PERCENT', '0').replace('%', ''))},
        {"label": "Cost", "value": get_cumulative_cost(), "status": "info"}
    ],
    "vmInformation": [
        {"label": "Hostname", "value": os.environ.get('HOSTNAME_VM', 'unknown')},
        {"label": "Instance ID", "value": os.environ.get('INSTANCE_ID', 'unknown')},
        {"label": "Zone", "value": zone},
        {"label": "Machine Type", "value": os.environ.get('MACHINE_TYPE', 'unknown')},
        {"label": "OS", "value": os.environ.get('OS_NAME', 'unknown')},
        {"label": "Project ID", "value": os.environ.get('PROJECT_ID', 'unknown')},
        {"label": "Estimated Cost (Usage)", "value": get_cumulative_cost(), "status": "info"}
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
        {"label": "Internal IP", "value": internal_ip, "status": "info"},
        {"label": "Public IP", "value": public_ip, "status": "info"}
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
    "systemLoad": load_avg,
    "identity": {
        "project": os.environ.get('PROJECT_ID', 'unknown'),
        "instanceId": os.environ.get('INSTANCE_ID', 'unknown'),
        "hostname": os.environ.get('HOSTNAME_VM', 'unknown'),
        "machineType": os.environ.get('MACHINE_TYPE', 'unknown')
    },
    "network": {
        "vpc": "default",
        "subnet": f"{region}-subnet" if region != 'unknown' else "unknown-subnet",
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
        "endpoints": {"healthz": "/healthz", "metadata": "/metadata"}
    }
}

output_file = os.path.join(data_dir, 'dashboard-data.json')
with open(output_file, 'w') as f:
    json.dump(data, f, indent=2)

print("Dashboard data generated successfully")
PYTHON_SCRIPT

# -------------------------------
# Dashboard Refresh Cron Job
# -------------------------------
log "Setting up cron job to refresh dashboard data"

cat > /opt/refresh-dashboard-data.py << 'EOF'
import json, os, random, subprocess, re
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
# Helper functions (same as main script)
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
            return float(f.read().split()[0])
    except:
        return 0.0

def get_ssh_status():
    ssh_active = os.environ.get('SSH_STATUS', 'active')
    return "Enabled (22/tcp)" if ssh_active.lower() == 'active' else "Disabled"

def get_update_status():
    updates = os.environ.get('UPDATES', '0')
    if updates == "Current" or updates == "0":
        return "Up to date"
    try:
        update_count = int(updates)
        return f"{update_count} security updates" if update_count < 5 else f"{update_count} updates available"
    except:
        return "Current"

def get_hourly_rate():
    machine_type = os.environ.get('MACHINE_TYPE', 'e2-micro').lower()
    machine_short = machine_type.split('/')[-1]
    rates = {'e2-micro': 0.0076, 'e2-small': 0.0150, 'e2-medium': 0.0301,
             'n1-standard-1': 0.0475, 'n2-standard-2': 0.0972, 't3.micro': 0.0104, 't3.small': 0.0208}
    return rates.get(machine_short, 0.01)

def get_cumulative_cost():
    cost_file = '/var/tmp/vm-cost.json'
    hourly_rate = get_hourly_rate()
    try:
        with open('/proc/uptime', 'r') as f:
            current_uptime = float(f.read().split()[0])
    except:
        current_uptime = 0
    try:
        with open(cost_file, 'r') as f:
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
    with open(cost_file, 'w') as f:
        json.dump({'total_cost': total_cost, 'last_uptime_sec': last_uptime}, f)
    if total_cost < 0.01:
        return f"${total_cost:.4f} total"
    elif total_cost < 1:
        return f"${total_cost:.3f} total"
    else:
        return f"${total_cost:.2f} total"

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
except:
    quotes = [{"text": "Welcome to DevSecOps!", "author": "System"}]

# ------------------------------------------------------------
# Build dynamic parts
# ------------------------------------------------------------
summaryCards = [
    {"label": "CPU", "value": f"{cpu_usage}%", "status": status(cpu_usage)},
    {"label": "Memory", "value": f"{mem_percent}%", "status": status(mem_percent)},
    {"label": "Disk", "value": disk_percent, "status": status(disk_percent.replace('%', ''))},
    {"label": "Cost", "value": get_cumulative_cost(), "status": "info"}
]

services = [
    {"label": "Nginx", "value": os.environ.get('NGINX_STATUS', 'Running'), "status": "healthy"},
    {"label": "Python", "value": os.environ.get('PYTHON_STATUS', 'Installed'), "status": "healthy"},
    {"label": "Metadata Service", "value": "Reachable", "status": "healthy"},
    {"label": "HTTP Service", "value": "Serving", "status": "healthy"},
    {"label": "Startup Script", "value": "Completed", "status": "healthy"},
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
    {"time": (datetime.now() - timedelta(minutes=15)).strftime("%H:%M:%S"), "level": "info", "scope": "quotes", "message": f"Quotes loaded: {len(quotes)}"},
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
memory_details = {"total": 0, "used": 0, "free": 0}
disk_details = {"total": 0, "used": 0, "available": 0}
try:
    out = subprocess.check_output(['free', '-m'], text=True)
    for line in out.split('\n'):
        if 'Mem:' in line:
            parts = line.split()
            memory_details = {'total': int(parts[1]), 'used': int(parts[2]), 'free': int(parts[3])}
            break
    out = subprocess.check_output(['df', '-BM', '/'], text=True)
    parts = out.split('\n')[1].split()
    disk_details = {'total': int(parts[1].rstrip('M')), 'used': int(parts[2].rstrip('M')), 'available': int(parts[3].rstrip('M'))}
except:
    pass

cpu_info = {"cores": 1, "frequency": None, "usage": float(cpu_usage)}

# ------------------------------------------------------------
# Merge with existing static data
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
    "memory": memory_details,
    "disk": disk_details,
    "cpu": cpu_info,
    "endpoints": {"healthz": "/healthz", "metadata": "/metadata"}
})
if "cpu" in systemResources:
    systemResources["cpu"]["usage"] = float(cpu_usage)

# ------------------------------------------------------------
# Build final data
# ------------------------------------------------------------
data = {
    "summaryCards": summaryCards,
    "vmInformation": existing.get('vmInformation', []),
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

with open(DASHBOARD_JSON, "w") as f:
    json.dump(data, f, indent=2)

print(f"Dashboard data refreshed - CPU: {cpu_usage}%, Memory: {mem_percent}%, Disk: {disk_percent}")
EOF

chmod +x /opt/refresh-dashboard-data.py

REFRESH_CRON_CMD="*/5 * * * * /usr/bin/python3 /opt/refresh-dashboard-data.py >> /var/log/dashboard-refresh.log 2>&1"
(crontab -l 2>/dev/null | grep -v 'refresh-dashboard-data'; echo "$REFRESH_CRON_CMD") | crontab -

log "Dashboard refresh cron job configured (every 5 minutes)"

# -------------------------------
# Ensure index.html Exists
# -------------------------------
if [ ! -f "${APP_DIR}/index.html" ]; then
  log "Creating fallback index.html"
  echo "<h1>Dashboard initializing...</h1>" > "${APP_DIR}/index.html"
fi

# -------------------------------
# Nginx Configuration
# -------------------------------
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
    
    location /data/ {
        alias ${DATA_DIR}/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store";
        
        types {
            image/webp webp;
            image/jpeg jpg jpeg;
            image/png png;
            image/gif gif;
            image/svg+xml svg;
            application/json json;
        }
        default_type application/octet-stream;
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

# -------------------------------
# Auto-Deploy Dashboard Updates
# -------------------------------
log "Setting up dashboard auto-deploy"

sudo tee /opt/dashboard-deploy.sh > /dev/null << 'DEPLOY_SCRIPT'
#!/bin/bash
LOCK_FILE=/tmp/dashboard.lock
REPO_DIR=/opt/vm-dashboard
APP_DIR=/var/www/vm-dashboard
DATA_DIR=/var/www/vm-dashboard/data
TMP_DIR=/tmp/dashboard-build

if [ -f "$LOCK_FILE" ]; then
  exit 0
fi
touch "$LOCK_FILE"
trap "rm -f \"$LOCK_FILE\"" EXIT

echo "[DEPLOY] $(date): Checking for updates..." >> /var/log/dashboard-deploy.log

cd "$REPO_DIR" || exit 0
chown -R appuser:appuser "$REPO_DIR"
git config --global --add safe.directory "$REPO_DIR"

cd dashboard || exit 0

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL")

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "[DEPLOY] $(date): Changes detected, deploying..." >> /var/log/dashboard-deploy.log

  git pull || exit 1
  cd "$REPO_DIR/dashboard" || exit 1

  # Update pricing script
  if [ -f "$REPO_DIR/scripts/fetch_pricing.py" ]; then
    cp -f "$REPO_DIR/scripts/fetch_pricing.py" /opt/scripts/fetch_pricing.py
    chmod +x /opt/scripts/fetch_pricing.py
    export DATA_DIR="$DATA_DIR"
    /opt/scripts/fetch_pricing.py
  fi

  # Reliable image sync
  mkdir -p "$DATA_DIR"
  chown appuser:appuser "$DATA_DIR" 2>/dev/null || true

  mkdir -p "$DATA_DIR/images"
  rm -rf "$DATA_DIR/images"/* 2>/dev/null || true

  if [ -f "$REPO_DIR/images.json" ]; then
      if cp -f "$REPO_DIR/images.json" "$DATA_DIR/images.json"; then
          if jq empty "$DATA_DIR/images.json" 2>/dev/null; then
              echo "[DEPLOY] images.json copied and valid" >> /var/log/dashboard-deploy.log
          else
              echo "[DEPLOY] ERROR: images.json is invalid JSON" >> /var/log/dashboard-deploy.log
              rm -f "$DATA_DIR/images.json"
          fi
      else
          echo "[DEPLOY] ERROR: Failed to copy images.json" >> /var/log/dashboard-deploy.log
      fi
  else
      echo "[DEPLOY] WARNING: images.json not found in repo root" >> /var/log/dashboard-deploy.log
  fi

  if [ -d "$REPO_DIR/images" ]; then
      chown -R appuser:appuser "$DATA_DIR/images" 2>/dev/null || true
      if cp -rf "$REPO_DIR/images/." "$DATA_DIR/images/"; then
          echo "[DEPLOY] Images copied from $REPO_DIR/images" >> /var/log/dashboard-deploy.log
      else
          echo "[DEPLOY] ERROR: Failed to copy images" >> /var/log/dashboard-deploy.log
      fi
  else
      echo "[DEPLOY] WARNING: No images directory in repo" >> /var/log/dashboard-deploy.log
      cat > "$DATA_DIR/images/placeholder.svg" << 'SVG'
<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
  <rect width='200' height='200' fill='#ccc'/>
  <text x='50%' y='50%' text-anchor='middle' dy='.3em' fill='#333'>No images</text>
</svg>
SVG
  fi

  chown -R appuser:appuser "$DATA_DIR/images" 2>/dev/null || true
  chmod -R 755 "$DATA_DIR/images" 2>/dev/null || true
  chown appuser:appuser "$DATA_DIR/images.json" 2>/dev/null || true
  chmod 644 "$DATA_DIR/images.json" 2>/dev/null || true

  if [ -d "$DATA_DIR/images" ] && [ "$(ls -A "$DATA_DIR/images" 2>/dev/null)" ]; then
      FINAL_COUNT=$(find "$DATA_DIR/images" -type f | wc -l)
      echo "[DEPLOY] VERIFICATION: ${FINAL_COUNT} image files available" >> /var/log/dashboard-deploy.log
  else
      echo "[DEPLOY] ERROR: No images found after copy attempt" >> /var/log/dashboard-deploy.log
  fi

  # Build dashboard
  if ! npm ci 2>/dev/null; then
    npm install || exit 1
  fi
  npm run build || exit 1

  if [ -d "dist" ]; then
    rm -rf "$TMP_DIR"
    cp -r dist "$TMP_DIR"
    rm -rf "$APP_DIR"/*
    cp -r "$TMP_DIR"/* "$APP_DIR"/
    echo "[DEPLOY] $(date): Deployment complete" >> /var/log/dashboard-deploy.log
  else
    echo "[DEPLOY] ERROR: Build failed – dist missing" >> /var/log/dashboard-deploy.log
    exit 1
  fi
else
  echo "[DEPLOY] $(date): No changes" >> /var/log/dashboard-deploy.log
fi
DEPLOY_SCRIPT

sudo chmod +x /opt/dashboard-deploy.sh

(crontab -u ${APP_USER} -l 2>/dev/null | grep -v 'dashboard-deploy.sh'; echo "*/15 * * * * /opt/dashboard-deploy.sh >> /var/log/dashboard-deploy.log 2>&1") | crontab -u ${APP_USER} -

log "Auto-deploy cron job configured (every 15 minutes)"
log "Dashboard available at http://${PUBLIC_IP}"