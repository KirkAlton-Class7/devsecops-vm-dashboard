#!/usr/bin/env bash

# -------------------------------
# Dashboard configuration
# -------------------------------
DASHBOARD_APP_NAME="${DASHBOARD_APP_NAME:-Basic VM Dashboard}"
DASHBOARD_TAGLINE="${DASHBOARD_TAGLINE:-VM health and basic metadata}"
DASHBOARD_USER="${DASHBOARD_USER:-Kirk Alton}"
DASHBOARD_NAME="${DASHBOARD_NAME:-Basic VM Dashboard}"

# ---------------------------------
# React build link configuration
# ---------------------------------
export VITE_GITHUB_URL="${VITE_GITHUB_URL:-https://github.com/KirkAlton-Class7}"
export VITE_LINKEDIN_URL="${VITE_LINKEDIN_URL:-https://www.linkedin.com/in/kirkcochranjr/}"

# =================================
# END OF CONFIGURATION
# ---------------------------------
# Modify sections below with caution.
# ==================================

APP_USER="appuser"
APP_NAME="basic-vm-dashboard"
APP_DIR="/var/www/${APP_NAME}"
NGINX_SITE="/etc/nginx/sites-available/${APP_NAME}"
DATA_DIR="${APP_DIR}/data"
REPO_DIR="${REPO_DIR:-/opt/deploy}"
DASHBOARD_ROOT="${REPO_DIR}/dashboard-basic"
APP_SOURCE_DIR="${DASHBOARD_ROOT}/dashboard"
SCRIPT_SOURCE_DIR="${DASHBOARD_ROOT}/scripts"
SHARED_ASSETS_DIR="${REPO_DIR}/shared/assets"
SHARED_QUOTES_FILE="${SHARED_ASSETS_DIR}/quotes/quotes.json"
SHARED_GALLERY_DIR="${SHARED_ASSETS_DIR}/images/image_gallery"
SHARED_GALLERY_MANIFEST="${SHARED_GALLERY_DIR}/gallery-manifest.json"

export DEBIAN_FRONTEND=noninteractive
export DASHBOARD_APP_NAME DASHBOARD_TAGLINE DASHBOARD_USER DASHBOARD_NAME
export HOME=/root

exec > /var/log/startup-script.log 2>&1
set -x
set -uo pipefail

log() { echo "[${APP_NAME}] $1"; }

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
  while command -v fuser >/dev/null 2>&1 && fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
    sleep 2
  done
  log "Apt lock released"
}

run_as_appuser() {
  sudo -u "${APP_USER}" -H bash -lc "cd \"${APP_SOURCE_DIR}\" && $*"
}

deploy_static_build() {
  local src_dir="$1"
  local dest_dir="$2"

  if [ ! -f "${src_dir}/index.html" ]; then
    log "ERROR: staged build is missing index.html"
    return 1
  fi

  mkdir -p "${dest_dir}"
  if [ -d "${src_dir}/assets" ]; then
    mkdir -p "${dest_dir}/assets"
    cp -a "${src_dir}/assets/." "${dest_dir}/assets/"
  fi

  find "${src_dir}" -mindepth 1 -maxdepth 1 ! -name index.html ! -name assets -exec cp -a {} "${dest_dir}/" \;
  cp -a "${src_dir}/index.html" "${dest_dir}/index.html"
}

sync_shared_assets() {
  mkdir -p "${DATA_DIR}" "${DATA_DIR}/images"

  if [ -f "${SHARED_QUOTES_FILE}" ]; then
    cp -f "${SHARED_QUOTES_FILE}" "${DATA_DIR}/quotes.json"
    cp -f "${SHARED_QUOTES_FILE}" "${DATA_DIR}/quotes_local.json"
    log "Shared quotes applied from ${SHARED_QUOTES_FILE}"
  else
    log "WARN: Shared quotes not found at ${SHARED_QUOTES_FILE}"
  fi

  if [ -d "${SHARED_GALLERY_DIR}" ]; then
    find "${DATA_DIR}/images" -mindepth 1 -maxdepth 1 -type f -delete 2>/dev/null || true
    find "${SHARED_GALLERY_DIR}" -maxdepth 1 -type f \( -name '*.webp' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \) -exec cp -f {} "${DATA_DIR}/images/" \;
    log "Shared gallery images applied from ${SHARED_GALLERY_DIR}"
  fi

  if [ -f "${SHARED_GALLERY_MANIFEST}" ]; then
    cp -f "${SHARED_GALLERY_MANIFEST}" "${DATA_DIR}/gallery-manifest.json"
    cp -f "${SHARED_GALLERY_MANIFEST}" "${DATA_DIR}/images.json"
    log "Shared gallery manifest applied from ${SHARED_GALLERY_MANIFEST}"
  fi

  chown -R "${APP_USER}:${APP_USER}" "${DATA_DIR}" 2>/dev/null || true
  chmod -R 755 "${DATA_DIR}" 2>/dev/null || true
}

mkdir -p /opt

wait_for_apt
retry apt-get update -y

wait_for_apt
retry apt-get install -y \
  nginx \
  python3 \
  curl \
  ca-certificates \
  git \
  sudo

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js"
  retry curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
  bash /tmp/nodesource_setup.sh
  wait_for_apt
  apt-get install -y nodejs
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "${APP_USER}"
fi

mkdir -p "${APP_DIR}" "${DATA_DIR}" /home/${APP_USER}/.npm
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}" /home/${APP_USER}/.npm

log "Setting up Basic VM Dashboard API"
API_SCRIPT="${SCRIPT_SOURCE_DIR}/dashboard_api.py"
if [ ! -f "${API_SCRIPT}" ]; then
  log "ERROR: API script not found at ${API_SCRIPT}"
  exit 1
fi
chmod +x "${API_SCRIPT}"

cat > /etc/systemd/system/dashboard-api.service << EOF
[Unit]
Description=Basic VM Dashboard API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=DASHBOARD_APP_NAME=${DASHBOARD_APP_NAME}
Environment=DASHBOARD_TAGLINE=${DASHBOARD_TAGLINE}
Environment=DASHBOARD_USER=${DASHBOARD_USER}
Environment=DASHBOARD_NAME=${DASHBOARD_NAME}
ExecStart=/usr/bin/python3 ${API_SCRIPT}
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dashboard-api.service
systemctl restart dashboard-api.service

sleep 2
if ! systemctl is-active --quiet dashboard-api.service; then
  log "ERROR: dashboard-api.service failed to start"
  systemctl status dashboard-api.service --no-pager || true
  exit 1
fi

log "Building dashboard"
cd "${APP_SOURCE_DIR}" || exit 1
chown -R "${APP_USER}:${APP_USER}" "${REPO_DIR}"

if ! run_as_appuser "npm ci"; then
  run_as_appuser "npm install" || exit 1
fi
run_as_appuser "npm run build" || exit 1

if [ ! -f "${APP_SOURCE_DIR}/dist/index.html" ]; then
  log "ERROR: frontend build missing dist/index.html"
  exit 1
fi

BUILD_STAGE="$(mktemp -d /tmp/basic-vm-dashboard-build.XXXXXX)"
cp -a "${APP_SOURCE_DIR}/dist/." "${BUILD_STAGE}/"
deploy_static_build "${BUILD_STAGE}" "${APP_DIR}"
rm -rf "${BUILD_STAGE}"

sync_shared_assets

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chmod -R 755 "${APP_DIR}"

log "Configuring Nginx"
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default

cat > "${NGINX_SITE}" << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;
    root ${APP_DIR};
    index index.html;

    location = /healthz {
        proxy_pass http://127.0.0.1:8080/healthz;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location = /metadata {
        proxy_pass http://127.0.0.1:8080/metadata;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /data/ {
        alias ${DATA_DIR}/;
        access_log off;
        add_header Cache-Control "public, max-age=300";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/${APP_NAME}
nginx -t
systemctl enable nginx
systemctl restart nginx

log "Validating deployment"
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1/api/dashboard >/dev/null
curl -fsS http://127.0.0.1/ >/dev/null

log "Setting up auto-deploy"
cat > /opt/dashboard-deploy.sh << 'DEPLOY'
#!/usr/bin/env bash
set -euo pipefail

APP_USER="appuser"
APP_NAME="basic-vm-dashboard"
REPO_DIR="/opt/deploy"
APP_DIR="/var/www/${APP_NAME}"
LOCK_FILE="/tmp/${APP_NAME}-deploy.lock"
DATA_DIR="${APP_DIR}/data"
DASHBOARD_ROOT="${REPO_DIR}/dashboard-basic"
APP_SOURCE_DIR="${DASHBOARD_ROOT}/dashboard"
SCRIPT_SOURCE_DIR="${DASHBOARD_ROOT}/scripts"
SHARED_ASSETS_DIR="${REPO_DIR}/shared/assets"
SHARED_QUOTES_FILE="${SHARED_ASSETS_DIR}/quotes/quotes.json"
SHARED_GALLERY_DIR="${SHARED_ASSETS_DIR}/images/image_gallery"
SHARED_GALLERY_MANIFEST="${SHARED_GALLERY_DIR}/gallery-manifest.json"

log() { echo "[$(date -Is)] [${APP_NAME}-deploy] $*"; }

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log "Another deploy is already running"
  exit 0
fi

run_as_appuser() {
  sudo -u "${APP_USER}" -H bash -lc "cd \"${APP_SOURCE_DIR}\" && $*"
}

deploy_static_build() {
  local src_dir="$1"
  local dest_dir="$2"

  [ -f "${src_dir}/index.html" ] || { log "staged build missing index.html"; exit 1; }
  mkdir -p "${dest_dir}"
  if [ -d "${src_dir}/assets" ]; then
    mkdir -p "${dest_dir}/assets"
    cp -a "${src_dir}/assets/." "${dest_dir}/assets/"
  fi
  find "${src_dir}" -mindepth 1 -maxdepth 1 ! -name index.html ! -name assets -exec cp -a {} "${dest_dir}/" \;
  cp -a "${src_dir}/index.html" "${dest_dir}/index.html"
}

sync_shared_assets() {
  mkdir -p "${DATA_DIR}" "${DATA_DIR}/images"
  if [ -f "${SHARED_QUOTES_FILE}" ]; then
    cp -f "${SHARED_QUOTES_FILE}" "${DATA_DIR}/quotes.json"
    cp -f "${SHARED_QUOTES_FILE}" "${DATA_DIR}/quotes_local.json"
  fi
  if [ -d "${SHARED_GALLERY_DIR}" ]; then
    find "${DATA_DIR}/images" -mindepth 1 -maxdepth 1 -type f -delete 2>/dev/null || true
    find "${SHARED_GALLERY_DIR}" -maxdepth 1 -type f \( -name '*.webp' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \) -exec cp -f {} "${DATA_DIR}/images/" \;
  fi
  if [ -f "${SHARED_GALLERY_MANIFEST}" ]; then
    cp -f "${SHARED_GALLERY_MANIFEST}" "${DATA_DIR}/gallery-manifest.json"
    cp -f "${SHARED_GALLERY_MANIFEST}" "${DATA_DIR}/images.json"
  fi
  chown -R "${APP_USER}:${APP_USER}" "${DATA_DIR}" 2>/dev/null || true
  chmod -R 755 "${DATA_DIR}" 2>/dev/null || true
}

cd "${REPO_DIR}"
git fetch origin main --depth=1 || { log "git fetch failed; existing deployment left intact"; exit 1; }
git reset --hard origin/main || { log "git reset failed; existing deployment left intact"; exit 1; }

cd "${APP_SOURCE_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${REPO_DIR}"
if ! run_as_appuser "npm ci"; then
  run_as_appuser "npm install" || { log "npm install failed; existing deployment left intact"; exit 1; }
fi
run_as_appuser "npm run build" || { log "build failed; existing deployment left intact"; exit 1; }

BUILD_STAGE="$(mktemp -d /tmp/basic-vm-dashboard-build.XXXXXX)"
cp -a "${APP_SOURCE_DIR}/dist/." "${BUILD_STAGE}/"
deploy_static_build "${BUILD_STAGE}" "${APP_DIR}"
rm -rf "${BUILD_STAGE}"
sync_shared_assets
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chmod -R 755 "${APP_DIR}"
systemctl restart dashboard-api.service
systemctl reload nginx
log "Deploy complete"
DEPLOY

chmod +x /opt/dashboard-deploy.sh
(crontab -l 2>/dev/null | grep -v dashboard-deploy.sh; echo "*/15 * * * * /opt/dashboard-deploy.sh >> /var/log/dashboard-deploy.log 2>&1") | crontab -

PUBLIC_IP="$(curl -fsS --max-time 3 http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google' 2>/dev/null || true)"
log "Dashboard available at http://${PUBLIC_IP:-VM_EXTERNAL_IP}"
log "Startup complete"
