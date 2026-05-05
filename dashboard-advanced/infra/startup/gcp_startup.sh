# GCP Bootstrap Script
# TODO: Try to make dynamic/cloud agnostic

#!/bin/bash
set -e
exec > /var/log/bootstrap.log 2>&1
set -x

echo "Bootstrap started at $(date)"

# ------------------------------------------------------------
# Helper: wait for cloud-init (optional, with timeout)
# ------------------------------------------------------------
if command -v cloud-init >/dev/null 2>&1; then
    echo "INFO: Waiting for cloud-init (max 60s)..."
    timeout 60 cloud-init status --wait || echo "WARN: cloud-init wait skipped (timeout or no status)"
fi

# ------------------------------------------------------------
# Helper: wait for dpkg lock
# ------------------------------------------------------------
wait_for_apt() {
    local max_wait=120
    local waited=0
    if command -v fuser >/dev/null 2>&1; then
        while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
            if [ $waited -ge $max_wait ]; then
                echo "ERROR: dpkg lock held for too long (${max_wait}s)"
                exit 1
            fi
            echo "INFO: Waiting for dpkg lock... (${waited}s)"
            sleep 5
            waited=$((waited+5))
        done
    else
        while [ -f /var/lib/dpkg/lock-frontend ]; do
            if [ $waited -ge $max_wait ]; then
                echo "ERROR: dpkg lock file exists too long (${max_wait}s)"
                exit 1
            fi
            echo "INFO: Waiting for dpkg lock file to disappear... (${waited}s)"
            sleep 5
            waited=$((waited+5))
        done
    fi
}

# ------------------------------------------------------------
# Install git
# ------------------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    wait_for_apt
    apt-get update -y -o Acquire::http::Timeout=10 -o Acquire::https::Timeout=10
    wait_for_apt
    apt-get install -y git curl python3 python3-venv
elif command -v yum >/dev/null 2>&1; then
    yum install -y git curl python3
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y git curl python3
else
    echo "ERROR: No known package manager found"
    exit 1
fi

# ------------------------------------------------------------
# Read Terraform-provided HTTPS settings from instance metadata
# ------------------------------------------------------------
metadata_value() {
    curl -fsS -H "Metadata-Flavor: Google" \
        "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" \
        2>/dev/null || true
}

DASHBOARD_HOSTNAME="$(metadata_value dashboard-hostname)"
LETSENCRYPT_EMAIL="$(metadata_value letsencrypt-email)"
LETSENCRYPT_STAGING="$(metadata_value letsencrypt-staging)"
DASHBOARD_DEV_AUTH_USER_SECRET_ID="$(metadata_value dashboard-dev-auth-user-secret)"
DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID="$(metadata_value dashboard-dev-auth-password-secret)"
DASHBOARD_FINOPS_AUTH_USER_SECRET_ID="$(metadata_value dashboard-finops-auth-user-secret)"
DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID="$(metadata_value dashboard-finops-auth-password-secret)"
LETSENCRYPT_STAGING="${LETSENCRYPT_STAGING:-false}"
export DASHBOARD_HOSTNAME LETSENCRYPT_EMAIL LETSENCRYPT_STAGING
export DASHBOARD_DEV_AUTH_USER_SECRET_ID DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID
export DASHBOARD_FINOPS_AUTH_USER_SECRET_ID DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID

if [ -n "$DASHBOARD_HOSTNAME" ]; then
    echo "INFO: Dashboard hostname configured as $DASHBOARD_HOSTNAME"
else
    echo "INFO: No dashboard hostname configured; HTTPS setup will be skipped"
fi

if printf '%s' "$LETSENCRYPT_STAGING" | grep -Eiq '^(1|true|yes)$'; then
    echo "INFO: Let's Encrypt staging mode enabled"
fi

if [ -n "$DASHBOARD_DEV_AUTH_USER_SECRET_ID" ] && [ -n "$DASHBOARD_DEV_AUTH_PASSWORD_SECRET_ID" ] && \
   [ -n "$DASHBOARD_FINOPS_AUTH_USER_SECRET_ID" ] && [ -n "$DASHBOARD_FINOPS_AUTH_PASSWORD_SECRET_ID" ]; then
    echo "INFO: Dashboard auth Secret Manager metadata configured"
else
    echo "WARN: Dashboard auth Secret Manager metadata is incomplete; app bootstrap will fail closed without env fallback credentials"
fi

# ------------------------------------------------------------
# Clone repository (or pull updates)
# ------------------------------------------------------------
REPO_DIR="/opt/deploy"
if [ ! -d "$REPO_DIR" ]; then
    echo "INFO: Cloning repository..."
    timeout 120 git clone --depth 1 https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git "$REPO_DIR"
else
    echo "INFO: Repository exists, pulling updates..."
    cd "$REPO_DIR" && timeout 60 git pull --depth 1
fi

# ------------------------------------------------------------
# Force update to the latest commit from the main branch
# ------------------------------------------------------------
cd "$REPO_DIR"
if git fetch --depth=1 origin main && git reset --hard origin/main; then
    echo "INFO: Updated repository to latest commit (origin/main)"
else
    echo "WARN: Could not update repository; using existing version"
fi

# ------------------------------------------------------------
# Run the main application bootstrap script
# ------------------------------------------------------------
MAIN_SCRIPT="/opt/deploy/dashboard-advanced/scripts/bootstrap/app_bootstrap.sh"
if [ ! -f "$MAIN_SCRIPT" ]; then
    echo "ERROR: Main script not found at $MAIN_SCRIPT"
    exit 1
fi
chmod +x "$MAIN_SCRIPT"
echo "INFO: Running main application bootstrap..."
timeout 1200 bash -x "$MAIN_SCRIPT"

# ------------------------------------------------------------
# Configure HTTPS with Let's Encrypt after nginx is available
# ------------------------------------------------------------
setup_https_retry() {
    if [ -z "${DASHBOARD_HOSTNAME:-}" ]; then
        echo "INFO: Skipping HTTPS setup because DASHBOARD_HOSTNAME is empty"
        return 0
    fi

    if [ -z "${LETSENCRYPT_EMAIL:-}" ]; then
        echo "WARN: Skipping HTTPS setup because LETSENCRYPT_EMAIL is empty"
        return 0
    fi

    local https_script="/usr/local/sbin/vm-dashboard-enable-https"

    cat > "$https_script" <<EOF
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="vm-dashboard"
DASHBOARD_HOSTNAME="${DASHBOARD_HOSTNAME}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL}"
LETSENCRYPT_STAGING="${LETSENCRYPT_STAGING}"
NGINX_SITE="/etc/nginx/sites-available/\${APP_NAME}"
CERTBOT_VENV="/opt/certbot-venv"
CERTBOT_BIN="\${CERTBOT_VENV}/bin/certbot"

log() { echo "[\${APP_NAME}-https] \$1"; }

if [ -f "/etc/letsencrypt/live/\${DASHBOARD_HOSTNAME}/fullchain.pem" ]; then
    log "Certificate already exists for \${DASHBOARD_HOSTNAME}; ensuring nginx HTTPS config is installed"
fi

PUBLIC_IP=\$(curl -fsS -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" 2>/dev/null || true)
DNS_IPS=\$(getent ahostsv4 "\${DASHBOARD_HOSTNAME}" | awk '{print \$1}' | sort -u | tr '\n' ' ')

if [ -z "\${PUBLIC_IP}" ]; then
    log "Could not read this VM's public IP from metadata"
    exit 0
fi

if ! printf '%s\n' "\${DNS_IPS}" | grep -qw "\${PUBLIC_IP}"; then
    log "DNS for \${DASHBOARD_HOSTNAME} has not propagated to \${PUBLIC_IP} yet. Current A records: \${DNS_IPS:-none}"
    exit 0
fi

if [ -f "\${NGINX_SITE}" ]; then
    sed -i "s/server_name _;/server_name \${DASHBOARD_HOSTNAME};/g" "\${NGINX_SITE}"
    nginx -t || exit 1
    systemctl reload nginx || systemctl restart nginx
else
    log "Nginx site \${NGINX_SITE} does not exist yet"
    exit 0
fi

if [ ! -x "\${CERTBOT_BIN}" ]; then
    log "Installing isolated Certbot environment"
    python3 -m venv "\${CERTBOT_VENV}"
    "\${CERTBOT_VENV}/bin/python" -m pip install --upgrade pip wheel
    "\${CERTBOT_VENV}/bin/python" -m pip install --upgrade certbot certbot-nginx
fi

CERTBOT_OUTPUT=\$(mktemp)
CERTBOT_ARGS=(
    --nginx
    -d "\${DASHBOARD_HOSTNAME}"
    --non-interactive
    --agree-tos
    --email "\${LETSENCRYPT_EMAIL}"
    --redirect
    --keep-until-expiring
)

if printf '%s' "\${LETSENCRYPT_STAGING}" | grep -Eiq '^(1|true|yes)$'; then
    log "Using Let's Encrypt staging environment"
    CERTBOT_ARGS+=(--staging)
fi

if ! "\${CERTBOT_BIN}" "\${CERTBOT_ARGS[@]}" 2>&1 | tee "\${CERTBOT_OUTPUT}"; then
    if grep -qi "too many certificates" "\${CERTBOT_OUTPUT}"; then
        log "Let's Encrypt rate limit reached for \${DASHBOARD_HOSTNAME}; leaving HTTP available and disabling HTTPS retry timer until the limit resets"
        systemctl disable --now vm-dashboard-https.timer 2>/dev/null || true
        rm -f "\${CERTBOT_OUTPUT}"
        exit 0
    fi
    rm -f "\${CERTBOT_OUTPUT}"
    exit 1
fi
rm -f "\${CERTBOT_OUTPUT}"

if [ ! -f "/etc/letsencrypt/live/\${DASHBOARD_HOSTNAME}/fullchain.pem" ]; then
    log "Certbot completed without creating the expected certificate"
    exit 1
fi

systemctl reload nginx || systemctl restart nginx
log "HTTPS enabled for https://\${DASHBOARD_HOSTNAME}"
EOF

    chmod +x "$https_script"

    cat > /etc/systemd/system/vm-dashboard-https.service <<'EOF'
[Unit]
Description=Enable HTTPS for VM dashboard
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/vm-dashboard-enable-https
EOF

    cat > /etc/systemd/system/vm-dashboard-https.timer <<'EOF'
[Unit]
Description=Retry VM dashboard HTTPS setup until DNS has propagated

[Timer]
OnBootSec=2min
OnUnitActiveSec=30min
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable --now vm-dashboard-https.timer
    systemctl start vm-dashboard-https.service || true
}

setup_https_retry

# ------------------------------------------------------------
# Setup monitoring endpoints server (runs on port 8080)
# ------------------------------------------------------------
echo "INFO: Setting up monitoring endpoints server"

# Install Python3 if missing
if ! command -v python3 >/dev/null 2>&1; then
    echo "INFO: Installing Python3..."
    if command -v apt-get >/dev/null 2>&1; then
        wait_for_apt
        apt-get install -y python3
    elif command -v yum >/dev/null 2>&1; then
        yum install -y python3
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y python3
    else
        echo "ERROR: Cannot install Python3 – no package manager found"
        exit 1
    fi
fi

# The monitoring script is expected at this location (in the repo)
MONITORING_SCRIPT="/opt/deploy/dashboard-advanced/scripts/monitoring_server.py"
if [ ! -f "$MONITORING_SCRIPT" ]; then
    echo "WARN: Monitoring script not found at $MONITORING_SCRIPT"
    echo "INFO: Skipping optional monitoring service; dashboard API is managed by app_bootstrap.sh"
    echo "SUCCESS: Bootstrap finished at $(date)"
    exit 0
fi

chmod +x "$MONITORING_SCRIPT"
echo "SUCCESS: Monitoring script permissions set"

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/monitoring.service"
cat > "$SERVICE_FILE" << 'EOF'
[Unit]
Description=Monitoring Endpoints Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/deploy/dashboard-advanced/scripts
ExecStart=/usr/bin/python3 /opt/deploy/dashboard-advanced/scripts/monitoring_server.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "SUCCESS: Systemd service file created at $SERVICE_FILE"

# Reload systemd, enable and start the service
systemctl daemon-reload
systemctl enable monitoring.service
systemctl start monitoring.service

# Check status
if systemctl is-active --quiet monitoring.service; then
    echo "SUCCESS: Monitoring server is RUNNING on port 8080"
    echo "INFO: Test locally: curl http://localhost:8080/healthz"
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
    if [ "$PUBLIC_IP" != "unknown" ]; then
        echo "INFO: From browser: http://$PUBLIC_IP:8080/healthz"
    fi
else
    echo "ERROR: Monitoring server failed to start. Check logs:"
    systemctl status monitoring.service --no-pager
fi

echo "SUCCESS: Monitoring endpoints server setup complete"

echo "SUCCESS: Bootstrap finished at $(date)"
