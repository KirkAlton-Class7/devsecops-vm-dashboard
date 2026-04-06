#!/bin/bash
set -e
exec > /var/log/bootstrap.log 2>&1
set -x

echo "Bootstrap started at $(date)"

# ------------------------------------------------------------
# Helper: wait for cloud-init (optional, with timeout)
# ------------------------------------------------------------
if command -v cloud-init >/dev/null 2>&1; then
    echo "Waiting for cloud-init (max 60s)..."
    timeout 60 cloud-init status --wait || echo "cloud-init wait skipped (timeout or no status)"
fi

# ------------------------------------------------------------
# Helper: wait for dpkg lock (works even without fuser)
# ------------------------------------------------------------
wait_for_apt() {
    local max_wait=120
    local waited=0
    # Use fuser if available, otherwise check lock file existence
    if command -v fuser >/dev/null 2>&1; then
        while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
            if [ $waited -ge $max_wait ]; then
                echo "ERROR: dpkg lock held for too long (${max_wait}s)"
                exit 1
            fi
            echo "Waiting for dpkg lock... (${waited}s)"
            sleep 5
            waited=$((waited+5))
        done
    else
        # Fallback: just wait for the lock file to disappear
        while [ -f /var/lib/dpkg/lock-frontend ]; do
            if [ $waited -ge $max_wait ]; then
                echo "ERROR: dpkg lock file exists too long (${max_wait}s)"
                exit 1
            fi
            echo "Waiting for dpkg lock file to disappear... (${waited}s)"
            sleep 5
            waited=$((waited+5))
        done
    fi
}

# ------------------------------------------------------------
# Install git using apt-get (Debian/Ubuntu) or yum/dnf
# ------------------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
    export DEBIAN_FRONTEND=noninteractive
    wait_for_apt
    apt-get update -y -o Acquire::http::Timeout=10 -o Acquire::https::Timeout=10
    wait_for_apt
    apt-get install -y git
elif command -v yum >/dev/null 2>&1; then
    yum install -y git
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y git
else
    echo "ERROR: No known package manager found"
    exit 1
fi

# ------------------------------------------------------------
# Shallow clone the repository (with timeout)
# ------------------------------------------------------------
REPO_DIR="/opt/deploy"
if [ ! -d "$REPO_DIR" ]; then
    timeout 120 git clone --depth 1 https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git "$REPO_DIR"
else
    cd "$REPO_DIR" && timeout 60 git pull --depth 1
fi

# ------------------------------------------------------------
# Run the main script (foreground, but with a global timeout)
# ------------------------------------------------------------
MAIN_SCRIPT="/opt/deploy/scripts/bootstrap/app_bootstrap.sh"

if [ ! -f "$MAIN_SCRIPT" ]; then
    echo "ERROR: Main script not found at $MAIN_SCRIPT"
    exit 1
fi

chmod +x "$MAIN_SCRIPT"

# Execute the main script directly (no background)
# Use `timeout` to prevent infinite hangs (adjust to your needs, e.g., 20 minutes)
timeout 1200 bash -x "$MAIN_SCRIPT"

echo "Bootstrap finished at $(date)"