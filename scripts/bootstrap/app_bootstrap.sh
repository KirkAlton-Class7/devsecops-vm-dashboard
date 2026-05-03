#!/usr/bin/env bash

# -------------------------------
# Dashboard configuration
# -------------------------------
DASHBOARD_APP_NAME="GCP Deployment"
DASHBOARD_TAGLINE="Infrastructure health and activity"
DASHBOARD_USER="Kirk Alton"
DASHBOARD_NAME="DevSecOps Dashboard"

# -------------------------------
# Dashboard credentials
# -------------------------------
DASHBOARD_DEV_AUTH_USER="${DASHBOARD_DEV_AUTH_USER:-${DASHBOARD_AUTH_USER:-dashboard}}"
DASHBOARD_DEV_AUTH_PASSWORD="${DASHBOARD_DEV_AUTH_PASSWORD:-${DASHBOARD_AUTH_PASSWORD:-}}"
DASHBOARD_DEV_AUTH_USER_SECRET_ID="${DASHBOARD_DEV_AUTH_USER_SECRET_ID:-${DASHBOARD_AUTH_USER_SECRET_ID:-}}"
DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID="${DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID:-${DASHBOARD_AUTH_PASSWORD_SECRET_ID:-}}"

DASHBOARD_FINOPS_AUTH_USER="${DASHBOARD_FINOPS_AUTH_USER:-finops}"
DASHBOARD_FINOPS_AUTH_PASSWORD="${DASHBOARD_FINOPS_AUTH_PASSWORD:-}"
DASHBOARD_FINOPS_AUTH_USER_SECRET_ID="${DASHBOARD_FINOPS_AUTH_USER_SECRET_ID:-}"
DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID="${DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID:-}"

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
CACHE_DIR="/var/cache/${APP_NAME}"

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
  python3-venv \
  python3-pip \
  curl \
  jq \
  ca-certificates \
  git \
  openssl \
  sudo \
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
# Resolve protected dashboard credentials
# ---------------------------------
metadata_attr() {
  curl -fsS --connect-timeout 2 --max-time 5 -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" \
    2>/dev/null || true
}

metadata_project_id() {
  curl -fsS --connect-timeout 2 --max-time 5 -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/project/project-id" \
    2>/dev/null || true
}

metadata_access_token() {
  curl -fsS --connect-timeout 2 --max-time 5 -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
    2>/dev/null | jq -r '.access_token // empty'
}

secret_version_name() {
  local secret_id="$1"
  local project_id="$2"

  case "$secret_id" in
    projects/*/secrets/*/versions/*) printf '%s' "$secret_id" ;;
    projects/*/secrets/*) printf '%s/versions/latest' "$secret_id" ;;
    *) printf 'projects/%s/secrets/%s/versions/latest' "$project_id" "$secret_id" ;;
  esac
}

read_secret_manager_value() {
  local secret_id="$1"
  local project_id="$2"
  local token secret_name response encoded

  token="$(metadata_access_token)"
  if [ -z "$token" ]; then
    log "ERROR: Could not retrieve VM service account access token for Secret Manager"
    return 1
  fi

  secret_name="$(secret_version_name "$secret_id" "$project_id")"
  if ! response="$(curl -fsS --connect-timeout 5 --max-time 20 \
    -H "Authorization: Bearer ${token}" \
    -H "Accept: application/json" \
    "https://secretmanager.googleapis.com/v1/${secret_name}:access")"; then
    log "ERROR: Could not access Secret Manager secret ${secret_name}"
    return 1
  fi

  encoded="$(printf '%s' "$response" | jq -r '.payload.data // empty')"
  if [ -z "$encoded" ]; then
    log "ERROR: Secret Manager response did not include payload data"
    return 1
  fi

  printf '%s' "$encoded" | base64 -d
}

resolve_auth_credentials() {
  local xtrace_was_on=0
  local project_id
  local metadata_dev_user_secret metadata_dev_password_secret
  local metadata_finops_user_secret metadata_finops_password_secret

  case "$-" in
    *x*) xtrace_was_on=1; set +x ;;
  esac

  metadata_dev_user_secret="$(metadata_attr dashboard-dev-auth-user-secret)"
  metadata_dev_password_secret="$(metadata_attr dashboard-dev-auth-password-secret)"
  metadata_finops_user_secret="$(metadata_attr dashboard-finops-auth-user-secret)"
  metadata_finops_password_secret="$(metadata_attr dashboard-finops-auth-password-secret)"

  # Backward-compatible metadata names map to the DevSecOps login.
  DASHBOARD_DEV_AUTH_USER_SECRET_ID="${DASHBOARD_DEV_AUTH_USER_SECRET_ID:-${metadata_dev_user_secret:-$(metadata_attr dashboard-auth-user-secret)}}"
  DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID="${DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID:-${metadata_dev_password_secret:-$(metadata_attr dashboard-auth-password-secret)}}"
  DASHBOARD_FINOPS_AUTH_USER_SECRET_ID="${DASHBOARD_FINOPS_AUTH_USER_SECRET_ID:-$metadata_finops_user_secret}"
  DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID="${DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID:-$metadata_finops_password_secret}"

  if [ -n "$DASHBOARD_DEV_AUTH_USER_SECRET_ID" ] || [ -n "$DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID" ] || \
     [ -n "$DASHBOARD_FINOPS_AUTH_USER_SECRET_ID" ] || [ -n "$DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID" ]; then
    log "Secret Manager credential lookup enabled"
    project_id="$(metadata_project_id)"
    if [ -z "$project_id" ]; then
      log "ERROR: Could not resolve GCP project ID from metadata for Secret Manager"
      [ "$xtrace_was_on" -eq 1 ] && set -x
      return 1
    fi

    if [ -n "$DASHBOARD_DEV_AUTH_USER_SECRET_ID" ]; then
      if ! DASHBOARD_DEV_AUTH_USER="$(read_secret_manager_value "$DASHBOARD_DEV_AUTH_USER_SECRET_ID" "$project_id")"; then
        [ "$xtrace_was_on" -eq 1 ] && set -x
        return 1
      fi
    fi

    if [ -n "$DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID" ]; then
      if ! DASHBOARD_DEV_AUTH_PASSWORD="$(read_secret_manager_value "$DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID" "$project_id")"; then
        [ "$xtrace_was_on" -eq 1 ] && set -x
        return 1
      fi
    fi

    if [ -n "$DASHBOARD_FINOPS_AUTH_USER_SECRET_ID" ]; then
      if ! DASHBOARD_FINOPS_AUTH_USER="$(read_secret_manager_value "$DASHBOARD_FINOPS_AUTH_USER_SECRET_ID" "$project_id")"; then
        [ "$xtrace_was_on" -eq 1 ] && set -x
        return 1
      fi
    fi

    if [ -n "$DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID" ]; then
      if ! DASHBOARD_FINOPS_AUTH_PASSWORD="$(read_secret_manager_value "$DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID" "$project_id")"; then
        [ "$xtrace_was_on" -eq 1 ] && set -x
        return 1
      fi
    fi
  fi

  if [ -z "$DASHBOARD_DEV_AUTH_USER" ] || [ -z "$DASHBOARD_DEV_AUTH_PASSWORD" ]; then
    log "ERROR: DevSecOps Basic Auth username and password must be provided by Secret Manager or environment variables"
    [ "$xtrace_was_on" -eq 1 ] && set -x
    return 1
  fi

  if [ -z "$DASHBOARD_FINOPS_AUTH_USER" ] || [ -z "$DASHBOARD_FINOPS_AUTH_PASSWORD" ]; then
    log "ERROR: FinOps Basic Auth username and password must be provided by Secret Manager or environment variables"
    [ "$xtrace_was_on" -eq 1 ] && set -x
    return 1
  fi

  log "Protected DevSecOps and FinOps credentials resolved"
  [ "$xtrace_was_on" -eq 1 ] && set -x
}

resolve_auth_credentials || exit 1

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

mkdir -p "${APP_DIR}" "${DATA_DIR}" "${CACHE_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"
chown -R root:root "${CACHE_DIR}"
chmod -R 755 "${APP_DIR}"
chmod 755 "${CACHE_DIR}"

# ---------------------------------
# Tune Nginx for dashboard traffic
# ---------------------------------
configure_nginx_tuning() {
  if [ -f /etc/nginx/nginx.conf ]; then
    sed -i -E 's/worker_connections[[:space:]]+[0-9]+;/worker_connections 4096;/' /etc/nginx/nginx.conf
  fi

  mkdir -p /etc/systemd/system/nginx.service.d
  cat > /etc/systemd/system/nginx.service.d/limits.conf <<'EOF'
[Service]
LimitNOFILE=8192
EOF
  systemctl daemon-reload
}

deploy_static_build() {
  local src_dir="$1"
  local dest_dir="$2"

  if [ ! -f "${src_dir}/index.html" ]; then
    log "ERROR: Refusing deploy because ${src_dir}/index.html is missing"
    return 1
  fi

  mkdir -p "${dest_dir}"

  # Copy hashed assets before index.html so the active page never points at missing files.
  if [ -d "${src_dir}/assets" ]; then
    mkdir -p "${dest_dir}/assets"
    cp -a "${src_dir}/assets/." "${dest_dir}/assets/"
  fi

  find "${src_dir}" -mindepth 1 -maxdepth 1 ! -name index.html ! -name assets -exec cp -a {} "${dest_dir}/" \;
  cp -a "${src_dir}/index.html" "${dest_dir}/index.html"
  chown -R ${APP_USER}:${APP_USER} "${dest_dir}"
  chmod -R 755 "${dest_dir}"
}

configure_nginx_tuning

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
# Install required Python packages (virtual environment)
# ---------------------------------
VENV_DIR="/opt/dashboard-venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "INFO: Creating Python virtual environment at $VENV_DIR"
    python3 -m venv "$VENV_DIR"
fi
echo "INFO: Installing Python dependencies for dashboard API"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install --upgrade google-cloud-monitoring google-cloud-bigquery

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
ExecStart=$VENV_DIR/bin/python3 $API_SCRIPT
Restart=always
RestartSec=5
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="HOME=/root"
Environment="VM_DASHBOARD_CACHE_DIR=${CACHE_DIR}"
Environment="VM_DASHBOARD_DEVSECOPS_CACHE_TTL=30"
Environment="VM_DASHBOARD_FINOPS_CACHE_TTL=600"

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
BUILD_STAGE="$(mktemp -d /tmp/vm-dashboard-build.XXXXXX)"
cp -a "$REPO_DIR/dashboard/dist/." "$BUILD_STAGE/"
deploy_static_build "$BUILD_STAGE" "${APP_DIR}" || {
  rm -rf "$BUILD_STAGE"
  log "ERROR: Dashboard deploy failed; existing frontend left intact"
  exit 1
}
rm -rf "$BUILD_STAGE"
mkdir -p "${DATA_DIR}" "${DATA_DIR}/images"
chown -R ${APP_USER}:${APP_USER} "${DATA_DIR}"

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

DEV_AUTH_FILE="/etc/nginx/.${APP_NAME}-dev.htpasswd"
FINOPS_AUTH_FILE="/etc/nginx/.${APP_NAME}-finops.htpasswd"
XTRACE_WAS_ON=0
case "$-" in
    *x*) XTRACE_WAS_ON=1; set +x ;;
esac
DEV_AUTH_HASH="$(openssl passwd -apr1 "${DASHBOARD_DEV_AUTH_PASSWORD}")"
FINOPS_AUTH_HASH="$(openssl passwd -apr1 "${DASHBOARD_FINOPS_AUTH_PASSWORD}")"
printf '%s:%s\n' "${DASHBOARD_DEV_AUTH_USER}" "${DEV_AUTH_HASH}" > "${DEV_AUTH_FILE}"
printf '%s:%s\n' "${DASHBOARD_FINOPS_AUTH_USER}" "${FINOPS_AUTH_HASH}" > "${FINOPS_AUTH_FILE}"
if [ "$XTRACE_WAS_ON" -eq 1 ]; then
    set -x
fi
chown root:www-data "${DEV_AUTH_FILE}" "${FINOPS_AUTH_FILE}" 2>/dev/null || chown root:root "${DEV_AUTH_FILE}" "${FINOPS_AUTH_FILE}"
chmod 640 "${DEV_AUTH_FILE}" "${FINOPS_AUTH_FILE}"

cat > /etc/nginx/conf.d/${APP_NAME}-rate-limit.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=vm_dashboard_public:10m rate=120r/m;
limit_req_zone $binary_remote_addr zone=vm_dashboard_protected:10m rate=30r/m;
limit_req_status 429;
EOF

cat > "${NGINX_SITE}" <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root ${APP_DIR};
    index index.html;
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    location = /healthz {
        access_log off;
        return 200 'ok\n';
        add_header Content-Type text/plain;
    }
    location = /metadata {
        auth_basic "VM Dashboard DevSecOps Data";
        auth_basic_user_file ${DEV_AUTH_FILE};
        limit_req zone=vm_dashboard_protected burst=10 nodelay;
        proxy_pass http://127.0.0.1:8080/metadata;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location = /api/dashboard/summary {
        limit_req zone=vm_dashboard_public burst=30 nodelay;
        proxy_pass http://127.0.0.1:8080/api/dashboard/summary;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location = /api/finops/summary {
        limit_req zone=vm_dashboard_public burst=30 nodelay;
        proxy_pass http://127.0.0.1:8080/api/finops/summary;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location = /api/dashboard {
        auth_basic "VM Dashboard DevSecOps Data";
        auth_basic_user_file ${DEV_AUTH_FILE};
        limit_req zone=vm_dashboard_protected burst=10 nodelay;
        proxy_pass http://127.0.0.1:8080/api/dashboard;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location = /api/finops {
        auth_basic "VM Dashboard FinOps Data";
        auth_basic_user_file ${FINOPS_AUTH_FILE};
        limit_req zone=vm_dashboard_protected burst=10 nodelay;
        proxy_pass http://127.0.0.1:8080/api/finops;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location /api/logs {
        auth_basic "VM Dashboard DevSecOps Data";
        auth_basic_user_file ${DEV_AUTH_FILE};
        limit_req zone=vm_dashboard_protected burst=10 nodelay;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location /api/ {
        limit_req zone=vm_dashboard_public burst=30 nodelay;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location /data/ {
        alias ${DATA_DIR}/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-store";
        types { image/webp webp; image/jpeg jpg jpeg; image/png png; }
    }
    location /assets/ {
        try_files \$uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
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
# Enable HTTPS with Let's Encrypt (if domain is configured)
# ---------------------------------
log "Checking for HTTPS configuration"

# Read metadata values (requires wrapper script to provide them or set via environment)
DASHBOARD_HOSTNAME="$(curl -fsS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/dashboard-hostname" \
    2>/dev/null || echo "")"
LETSENCRYPT_EMAIL="$(curl -fsS -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/letsencrypt-email" \
    2>/dev/null || echo "")"

if [ -n "$DASHBOARD_HOSTNAME" ] && [ -n "$LETSENCRYPT_EMAIL" ]; then
    log "HTTPS requested for domain $DASHBOARD_HOSTNAME – setting up Let's Encrypt"
    
    # Install certbot and its nginx plugin
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    
    # Temporarily configure nginx with the actual domain name for Certbot
    sed -i "s/server_name _;/server_name $DASHBOARD_HOSTNAME;/" "${NGINX_SITE}"
    systemctl reload nginx || systemctl restart nginx
    
    # Obtain certificate (this also modifies nginx config to listen on 443)
    certbot --nginx -d "$DASHBOARD_HOSTNAME" \
        --non-interactive \
        --agree-tos \
        --email "$LETSENCRYPT_EMAIL" \
        --redirect \
        --keep-until-expiring
    
    # Ensure HTTP to HTTPS redirection is active (already done by --redirect)
    systemctl reload nginx
    log "HTTPS enabled for https://$DASHBOARD_HOSTNAME"
else
    log "Skipping HTTPS setup: DASHBOARD_HOSTNAME or LETSENCRYPT_EMAIL missing"
fi

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
#!/usr/bin/env bash
set -u

LOCK_DIR=/tmp/dashboard-deploy.lock
REPO_DIR=/opt/deploy
APP_DIR=/var/www/vm-dashboard
DATA_DIR=/var/www/vm-dashboard/data
APP_USER=appuser
LOG_FILE=/var/log/dashboard-deploy.log

exec >> "$LOG_FILE" 2>&1

log() { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] [DEPLOY] $1"; }

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    log "Another deploy is already running; skipping"
    exit 0
fi

BUILD_DIR=""
cleanup() {
    [ -n "$BUILD_DIR" ] && rm -rf "$BUILD_DIR"
    rm -rf "$LOCK_DIR"
}
trap cleanup EXIT

run_as_appuser() {
    sudo -u "$APP_USER" env HOME="/home/$APP_USER" "$@"
}

deploy_static_build() {
    local src_dir="$1"
    local dest_dir="$2"

    if [ ! -f "$src_dir/index.html" ]; then
        log "Refusing deploy because $src_dir/index.html is missing"
        return 1
    fi

    mkdir -p "$dest_dir"

    # Copy hashed assets before index.html so users never receive HTML that points at missing files.
    if [ -d "$src_dir/assets" ]; then
        mkdir -p "$dest_dir/assets"
        cp -a "$src_dir/assets/." "$dest_dir/assets/"
    fi

    find "$src_dir" -mindepth 1 -maxdepth 1 ! -name index.html ! -name assets -exec cp -a {} "$dest_dir/" \;
    cp -a "$src_dir/index.html" "$dest_dir/index.html"
    chown -R "$APP_USER:$APP_USER" "$dest_dir"
    chmod -R 755 "$dest_dir"
}

cd "$REPO_DIR" || { log "Repo missing at $REPO_DIR"; exit 0; }
chown -R "$APP_USER:$APP_USER" "$REPO_DIR"
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

run_as_appuser git -C "$REPO_DIR" fetch origin main --depth=1 || { log "Fetch failed; existing deployment left intact"; exit 0; }
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL")

if [ "$LOCAL" != "$REMOTE" ]; then
    log "Changes detected; building new release"
    run_as_appuser git -C "$REPO_DIR" pull --ff-only || { log "Pull failed; existing deployment left intact"; exit 1; }
    cd "$REPO_DIR/dashboard" || { log "Dashboard directory missing"; exit 1; }

    if [ -f "$REPO_DIR/scripts/fetch_pricing.py" ]; then
        mkdir -p /opt/scripts
        cp -f "$REPO_DIR/scripts/fetch_pricing.py" /opt/scripts/fetch_pricing.py
        chmod +x /opt/scripts/fetch_pricing.py
        export DATA_DIR="$DATA_DIR"
        /opt/scripts/fetch_pricing.py || log "Pricing cache refresh failed"
    fi

    mkdir -p "$DATA_DIR/images"
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

    chown -R "$APP_USER:$APP_USER" "$DATA_DIR" 2>/dev/null || true
    chmod -R 755 "$DATA_DIR/images" 2>/dev/null || true

    # Ensure npm cache is writable for auto-deploy
    mkdir -p "/home/$APP_USER/.npm"
    chown -R "$APP_USER:$APP_USER" "/home/$APP_USER/.npm"

    if ! run_as_appuser npm ci 2>/dev/null; then
        run_as_appuser npm install || { log "npm install failed; existing deployment left intact"; exit 1; }
    fi
    run_as_appuser npm run build || { log "Build failed; existing deployment left intact"; exit 1; }

    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
        log "Build output missing; existing deployment left intact"
        exit 1
    fi

    BUILD_DIR="$(mktemp -d /tmp/dashboard-build.XXXXXX)"
    cp -a dist/. "$BUILD_DIR/"
    deploy_static_build "$BUILD_DIR" "$APP_DIR" || { log "Static deploy failed; existing deployment left intact"; exit 1; }
    mkdir -p "$DATA_DIR" "$DATA_DIR/images"
    chown -R "$APP_USER:$APP_USER" "$DATA_DIR"
    log "Deployment complete"
else
    log "No changes"
fi
DEPLOY_SCRIPT

chmod +x /opt/dashboard-deploy.sh
(crontab -l 2>/dev/null | grep -v 'dashboard-deploy.sh'; echo "*/15 * * * * /opt/dashboard-deploy.sh") | crontab -

log "Auto-deploy cron job configured (every 15 minutes)"
log "Dashboard available at http://${PUBLIC_IP}"
