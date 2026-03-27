#!/usr/bin/env bash
set -euo pipefail

APP_NAME="devsecops-sandbox"
APP_DIR="/var/www/${APP_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
DATA_DIR="${APP_DIR}/data"

GITHUB_QUOTES_URL="https://raw.githubusercontent.com/YOUR_GITHUB_USER/YOUR_REPO/main/quotes.json"

export DEBIAN_FRONTEND=noninteractive

log() { echo "[${APP_NAME}] $1"; }

md() {
  curl -fsS -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/$1"
}

safe_basename() {
  basename "$1" 2>/dev/null || echo "$1"
}

service_status() {
  systemctl is-active --quiet "$1" && echo "Running" || echo "Stopped"
}

command_status() {
  command -v "$1" >/dev/null && echo "Installed" || echo "Missing"
}

# -------------------------------
# Install packages
# -------------------------------
log "Installing packages"
apt-get update -y
apt-get install -y nginx python3 curl jq ca-certificates

mkdir -p "${APP_DIR}" "${DATA_DIR}"

# -------------------------------
# Quotes (local fallback)
# -------------------------------
LOCAL_QUOTES="${DATA_DIR}/quotes.local.json"
ACTIVE_QUOTES="${DATA_DIR}/quotes.json"

cat > "${LOCAL_QUOTES}" <<'EOF'
[
  {"text":"Automation beats repetition","author":"DevSecOps"},
  {"text":"Logs are evidence, not decoration","author":"DevSecOps"},
  {"text":"Security is a feature, not a patch","author":"DevSecOps"}
]
EOF

log "Fetching GitHub quotes"
GITHUB_QUOTES_SYNC="Failed"

if curl -fsSL "${GITHUB_QUOTES_URL}" -o "${ACTIVE_QUOTES}.tmp"; then
  if python3 -c "import json; json.load(open('${ACTIVE_QUOTES}.tmp'))"; then
    mv "${ACTIVE_QUOTES}.tmp" "${ACTIVE_QUOTES}"
    GITHUB_QUOTES_SYNC="Successful"
  else
    cp "${LOCAL_QUOTES}" "${ACTIVE_QUOTES}"
  fi
else
  cp "${LOCAL_QUOTES}" "${ACTIVE_QUOTES}"
fi

# -------------------------------
# Metadata
# -------------------------------
log "Collecting metadata"

HOSTNAME_VM="$(md instance/hostname || hostname)"
INSTANCE_ID="$(md instance/id || echo unknown)"
ZONE="$(safe_basename "$(md instance/zone)")"
MACHINE_TYPE="$(safe_basename "$(md instance/machine-type)")"
PROJECT_ID="$(md project/project-id)"

INTERNAL_IP="$(md instance/network-interfaces/0/ip)"
PUBLIC_IP="$(md instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null || echo None)"

OS_NAME="$(. /etc/os-release && echo "$PRETTY_NAME")"
UPTIME="$(uptime -p || echo unknown)"

# -------------------------------
# System metrics (REAL)
# -------------------------------
CPU_USAGE="$(top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}')"
MEM_PERCENT="$(free | awk '/Mem:/ {printf("%.0f"), $3/$2 * 100.0}')"
DISK_PERCENT="$(df / | tail -1 | awk '{print $5}')"

RX_BYTES="$(cat /sys/class/net/eth0/statistics/rx_bytes 2>/dev/null || echo 0)"
TX_BYTES="$(cat /sys/class/net/eth0/statistics/tx_bytes 2>/dev/null || echo 0)"

# -------------------------------
# Services
# -------------------------------
systemctl enable nginx
systemctl restart nginx

NGINX_STATUS="$(service_status nginx)"
PYTHON_STATUS="$(command_status python3)"
STARTUP_STATUS="Completed"

if md instance/name >/dev/null 2>&1; then
  METADATA_STATUS="Reachable"
else
  METADATA_STATUS="Unreachable"
fi

if curl -fsS http://127.0.0.1 >/dev/null 2>&1; then
  HTTP_STATUS="Serving"
else
  HTTP_STATUS="Unavailable"
fi

BOOTSTRAP_PACKAGES_JSON='["nginx","python3","curl","jq"]'

# -------------------------------
# Security
# -------------------------------
if command -v ufw >/dev/null; then
  FIREWALL_STATUS="$(ufw status | head -1 | sed 's/Status: //')"
else
  FIREWALL_STATUS="Not installed"
fi

SSH_STATUS="$(systemctl is-active ssh 2>/dev/null || echo Not installed)"

UPDATES="$(apt list --upgradable 2>/dev/null | tail -n +2 | wc -l)"
if [[ "$UPDATES" -eq 0 ]]; then
  UPDATE_STATUS="Current"
else
  UPDATE_STATUS="Pending ($UPDATES)"
fi

# -------------------------------
# Export for Python
# -------------------------------
export HOSTNAME_VM INSTANCE_ID ZONE MACHINE_TYPE OS_NAME PROJECT_ID INTERNAL_IP PUBLIC_IP
export NGINX_STATUS PYTHON_STATUS STARTUP_STATUS METADATA_STATUS HTTP_STATUS GITHUB_QUOTES_SYNC
export FIREWALL_STATUS SSH_STATUS UPDATE_STATUS UPTIME BOOTSTRAP_PACKAGES_JSON
export CPU_USAGE MEM_PERCENT DISK_PERCENT RX_BYTES TX_BYTES

# -------------------------------
# Generate JSON (inline Python)
# -------------------------------
python3 - <<'PY'
import json, os, random

def status(val, warn=70):
    try:
        return "warning" if float(val) > warn else "healthy"
    except:
        return "healthy"

quotes = []
try:
    with open("/var/www/devsecops-sandbox/data/quotes.json") as f:
        quotes = json.load(f)
except:
    quotes = [{"text":"Fallback quote","author":"System"}]

quote = random.choice(quotes)

data = {
    "summaryCards": [
        {"label":"CPU","value":f"{os.environ['CPU_USAGE']}%","status":status(os.environ['CPU_USAGE'])},
        {"label":"Memory","value":f"{os.environ['MEM_PERCENT']}%","status":status(os.environ['MEM_PERCENT'])},
        {"label":"Disk","value":os.environ['DISK_PERCENT'],"status":status(os.environ['DISK_PERCENT'].replace('%',''))},
        {"label":"Network","value":f"{os.environ['RX_BYTES']} / {os.environ['TX_BYTES']}","status":"healthy"}
    ],
    "vmInformation": [
        {"label":"Hostname","value":os.environ['HOSTNAME_VM']},
        {"label":"Instance ID","value":os.environ['INSTANCE_ID']},
        {"label":"Zone","value":os.environ['ZONE']},
        {"label":"Machine Type","value":os.environ['MACHINE_TYPE']},
        {"label":"OS","value":os.environ['OS_NAME']},
        {"label":"Project ID","value":os.environ['PROJECT_ID']}
    ],
    "services": [
        {"label":"Nginx","value":os.environ['NGINX_STATUS']},
        {"label":"Python","value":os.environ['PYTHON_STATUS']},
        {"label":"Metadata Service","value":os.environ['METADATA_STATUS']},
        {"label":"HTTP Service","value":os.environ['HTTP_STATUS']},
        {"label":"Startup Script","value":os.environ['STARTUP_STATUS']},
        {"label":"GitHub Quotes Sync","value":os.environ['GITHUB_QUOTES_SYNC']},
        {"label":"Bootstrap Packages","value":", ".join(json.loads(os.environ['BOOTSTRAP_PACKAGES_JSON']))}
    ],
    "security": [
        {"label":"Host Firewall","value":os.environ['FIREWALL_STATUS']},
        {"label":"SSH","value":os.environ['SSH_STATUS']},
        {"label":"Updates","value":os.environ['UPDATE_STATUS']},
        {"label":"Internal IP","value":os.environ['INTERNAL_IP']},
        {"label":"Public IP","value":os.environ['PUBLIC_IP']}
    ],
    "meta": {
        "appName": "DevSecOps Sandbox",
        "uptime": os.environ["UPTIME"]
    },
    "quote": quote
}

with open("/var/www/devsecops-sandbox/data/dashboard-data.json","w") as f:
    json.dump(data, f, indent=2)
PY

# -------------------------------
# Nginx config
# -------------------------------
cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    root ${APP_DIR};
    index index.html;

    location /data/ {
        add_header Cache-Control "no-store";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -s "${NGINX_SITE}" /etc/nginx/sites-enabled/

nginx -t && systemctl reload nginx

log "Startup complete"