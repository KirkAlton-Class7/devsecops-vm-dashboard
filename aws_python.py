# -------------------------------
# Generate Dashboard Data JSON
# -------------------------------

import json, os, random
from datetime import datetime, timedelta

# -------------------------------
# Configuration
# -------------------------------
DATA_DIR = os.environ.get("DATA_DIR")

if not DATA_DIR:
    raise RuntimeError("DATA_DIR environment variable is required but not set")

# -------------------------------
# Helper Functions
# -------------------------------

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

def get_cost_estimate_gcp():
    """GCP-specific cost estimation"""
    try:
        machine_type = os.environ.get('MACHINE_TYPE', 'e2-micro').lower()
        cpu = float(os.environ.get('CPU_USAGE', '0'))
        
        # GCP e2 series pricing (us-central1)
        if "micro" in machine_type:
            base_hourly = 0.012
        elif "small" in machine_type:
            base_hourly = 0.025
        elif "medium" in machine_type:
            base_hourly = 0.050
        else:
            base_hourly = 0.035
        
        usage_factor = min(max(cpu / 100, 0.1), 1.0)
        monthly_cost = base_hourly * 720 * usage_factor
        storage_cost = 1.00
        total = monthly_cost + storage_cost
        
        machine_display = machine_type.replace('-', ' ').title()
        return f"\${total:.2f}/month (GCP {machine_display})"
    except:
        return "Based on usage"

# -------------------------------
# Load Quotes
# -------------------------------
quotes = []
try:
    
    with open(f"{DATA_DIR}/quotes.json") as f:
        quotes = json.load(f)
        print(f"Loaded {len(quotes)} quotes")
except:
    quotes = [{"text": "Welcome to DevSecOps!", "author": "System"}]

quote = random.choice(quotes)

# -------------------------------
# Generate Logs
# -------------------------------
logs = [
    {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "Dashboard initialized"},
    {"time": (datetime.now() - timedelta(minutes=5)).strftime("%H:%M:%S"), "level": "info", "scope": "metrics", "message": f"CPU: {os.environ.get('CPU_USAGE', '0')}%, Memory: {os.environ.get('MEM_PERCENT', '0')}%"},
    {"time": (datetime.now() - timedelta(minutes=10)).strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "System health check passed"},
    {"time": (datetime.now() - timedelta(minutes=30)).strftime("%H:%M:%S"), "level": "info", "scope": "quotes", "message": f"Loaded {len(quotes)} quotes"},
    {"time": (datetime.now() - timedelta(hours=1)).strftime("%H:%M:%S"), "level": "info", "scope": "nginx", "message": "Nginx serving dashboard"}
]

# -------------------------------
# Resource Table
# -------------------------------
resource_table = [
    {"name": "nginx", "type": "service", "scope": "system", "status": os.environ.get('NGINX_STATUS', 'Running')},
    {"name": "python3", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "nodejs", "type": "runtime", "scope": "system", "status": "Installed"},
    {"name": "quotes.json", "type": "data", "scope": "app", "status": "Active"},
    {"name": "dashboard-data.json", "type": "data", "scope": "app", "status": "Active"}
]

# -------------------------------
# Build Data Structure
# -------------------------------
data = {
    "summaryCards": [
        {"label": "CPU", "value": f"{os.environ.get('CPU_USAGE', '0')}%", "status": status(os.environ.get('CPU_USAGE', '0'))},
        {"label": "Memory", "value": f"{os.environ.get('MEM_PERCENT', '0')}%", "status": status(os.environ.get('MEM_PERCENT', '0'))},
        {"label": "Disk", "value": os.environ.get('DISK_PERCENT', '0%'), "status": status(os.environ.get('DISK_PERCENT', '0').replace('%', ''))},
        {"label": "Cost", "value": get_cost_estimate_gcp(), "status": "info"}
    ],
    "vmInformation": [
        {"label": "Hostname", "value": os.environ.get('HOSTNAME_VM', 'unknown')},
        {"label": "Instance Name", "value": os.environ.get('INSTANCE_NAME', 'unknown')},
        {"label": "Instance ID", "value": os.environ.get('INSTANCE_ID', 'unknown')},
        {"label": "Zone", "value": os.environ.get('ZONE', 'unknown')},
        {"label": "Region", "value": os.environ.get('REGION', 'unknown')},
        {"label": "Machine Type", "value": os.environ.get('MACHINE_TYPE', 'unknown')},
        {"label": "OS", "value": os.environ.get('OS_NAME', 'unknown')},
        {"label": "Project ID", "value": os.environ.get('PROJECT_ID', 'unknown')}
    ],
    "services": [
        {"label": "Nginx", "value": os.environ.get('NGINX_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "Python", "value": os.environ.get('PYTHON_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "Metadata Service", "value": os.environ.get('METADATA_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "HTTP Service", "value": os.environ.get('HTTP_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "Startup Script", "value": os.environ.get('STARTUP_STATUS', 'Unknown'), "status": "healthy"},
        {"label": "GitHub Quotes Sync", "value": "Active", "status": "healthy"},
        {"label": "Bootstrap Packages", "value": "nginx, python3, curl, jq, git", "status": "healthy"}
    ],
    "security": [
        {"label": "Host Firewall", "value": os.environ.get('FIREWALL_STATUS', 'Not installed'), "status": "info"},
        {"label": "SSH", "value": get_ssh_status(), "status": "healthy"},
        {"label": "Updates", "value": get_update_status(), "status": "info"},
        {"label": "Internal IP", "value": os.environ.get('INTERNAL_IP', 'unknown'), "status": "info"},
        {"label": "Public IP", "value": os.environ.get('PUBLIC_IP', 'unknown'), "status": "info"}
    ],
    "meta": {
        "appName": os.environ.get('DASHBOARD_APP_NAME', 'GCP Dashboard'),
        "tagline": os.environ.get('DASHBOARD_TAGLINE', 'GCP Infrastructure Monitoring'),
        "dashboardUser": os.environ.get('DASHBOARD_USER', 'User'),
        "dashboardName": os.environ.get('DASHBOARD_NAME', 'GCP Dashboard'),
        "uptime": os.environ.get("UPTIME", "unknown")
    },
    "quote": quote,
    "logs": logs,
    "resourceTable": resource_table,
    "systemLoad": get_load_average()
}

with open(f"{DATA_DIR}/dashboard-data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Dashboard data generated successfully")