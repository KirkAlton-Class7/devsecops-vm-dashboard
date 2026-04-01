#!/usr/bin/env bash
# run-bootstrap.sh - Wrapper to pull and run the bootstrap script

REPO_URL="https://github.com/KirkAlton-Class7/devsecops-vm-dashboard.git"
WORK_DIR="/opt/vm-dashboard"

# Clone or update the repo containing gcp_script.sh
if [ ! -d "$WORK_DIR" ]; then
    git clone "$REPO_URL" "$WORK_DIR"
else
    cd "$WORK_DIR" && git pull
fi

# Run the main bootstrap script
cd "$WORK_DIR"
chmod +x gcp_script.sh
./gcp_script.sh