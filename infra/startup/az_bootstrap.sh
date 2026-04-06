#!/bin/bash
set -e
exec > /var/log/bootstrap.log 2>&1
set -x

echo "Bootstrap started at $(date)"

# Detect package manager and install git if missing
if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y git
elif command -v yum >/dev/null 2>&1; then
    yum install -y git
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y git
else
    echo "ERROR: No known package manager found (apt-get, yum, dnf)"
    exit 1
fi

# Clone the repository
git clone https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git /opt/deploy

# Path to the main bootstrap script (inside the repo)
MAIN_SCRIPT="/opt/deploy/scripts/bootstrap/app_bootstrap.sh"

if [ ! -f "$MAIN_SCRIPT" ]; then
    echo "ERROR: Main script not found at $MAIN_SCRIPT"
    exit 1
fi

# Make it executable
chmod +x "$MAIN_SCRIPT"

# Execute the main script with verbose tracing
bash -x "$MAIN_SCRIPT"

echo "Bootstrap finished at $(date)"