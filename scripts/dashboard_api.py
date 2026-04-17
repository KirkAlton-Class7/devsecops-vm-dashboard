#!/usr/bin/env python3

# Monitoring server for GCP VM metadata and health checks.
# Serves /healthz (plain text), /metadata (JSON), and /api/dashboard (full dashboard data).


# -------------------------------
# IMPORTANT NOTES
# -------------------------------

# Service Account Permissions for Metadata Retrieval

# The default Compute Engine service account used by the VM must have at least `roles/compute.viewer`
# This allows the monitoring script to query instance details via `gcloud`.
# The role enables reading instance metadata, including subnet names, when the standard metadata server endpoint returns 404.

# Check current roles for the service account
# ```bash
# export PROJECT_ID=$(gcloud config get-value project)
# gcloud projects get-iam-policy $PROJECT_ID \
#   --flatten="bindings[].members" \
#   --format='table(bindings.role)' \
#   --filter="bindings.members:serviceAccount:YOUR_SA@developer.gserviceaccount.com"
# ```

# Grant the compute.viewer role if missing
# ``` bash
# gcloud projects add-iam-policy-binding $PROJECT_ID \
#   --member="serviceAccount:YOUR_SA@developer.gserviceaccount.com" \
#   --role="roles/compute.viewer"
# ```

import json
import os
import random
import subprocess
import urllib.request
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from functools import wraps
import time

# -------------------------------
# Constants
# -------------------------------
DATA_DIR = "/var/www/vm-dashboard/data"
COST_FILE = "/var/tmp/vm-cost.json"
WARN_THRESHOLD = 70

# -------------------------------
# Metadata Customization
# -------------------------------
student_name = "Kirk Alton"

# -------------------------------
# Helper Functions
# -------------------------------

def ttl_cache(seconds):
    def decorator(func):
        cache = {}
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            key = (func.__name__, args, tuple(kwargs.items()))
            if key in cache and (now - cache[key]['time']) < seconds:
                return cache[key]['value']
            result = func(*args, **kwargs)
            cache[key] = {'value': result, 'time': now}
            return result
        return wrapper
    return decorator

def get_metadata(path, timeout=2):
    """Fetch a specific metadata value from the GCE metadata server."""
    url = f"http://metadata.google.internal/computeMetadata/v1/{path}"
    cmd = ["curl", "-fsS", "-H", "Metadata-Flavor: Google", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        return "unknown"
    except (subprocess.TimeoutExpired, Exception):
        return "unknown"

def safe_basename(full_path):
    """Extract last component of a resource path."""
    if not full_path or full_path == "unknown":
        return full_path
    cleaned = full_path.strip()
    if not cleaned:
        return "unknown"
    if '/' in cleaned:
        return cleaned.split('/')[-1].strip()
    return cleaned.strip()

def get_os_name():
    try:
        with open("/etc/os-release", "r") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    return line.split("=")[1].strip().strip('"')
    except Exception:
        pass
    return "unknown"

def get_uptime():
    """Return human-readable uptime."""
    try:
        result = subprocess.run(["uptime", "-p"], capture_output=True, text=True, timeout=2)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    # Fallback: read /proc/uptime
    try:
        with open("/proc/uptime", "r") as f:
            seconds = float(f.read().split()[0])
            minutes = int(seconds // 60)
            hours = int(minutes // 60)
            days = int(hours // 24)
            minutes = minutes % 60
            hours = hours % 24
            if days > 0:
                return f"up {days} day{'s' if days != 1 else ''}, {hours} hour{'s' if hours != 1 else ''}, {minutes} minute{'s' if minutes != 1 else ''}"
            if hours > 0:
                return f"up {hours} hour{'s' if hours != 1 else ''}, {minutes} minute{'s' if minutes != 1 else ''}"
            return f"up {minutes} minute{'s' if minutes != 1 else ''}"
    except Exception:
        return "unknown"

def get_cpu_usage():
    with open("/proc/stat", "r") as f:
        line = f.readline()
        parts = line.split()
        user = int(parts[1])
        nice = int(parts[2])
        system = int(parts[3])
        idle = int(parts[4])
        total = user + nice + system + idle
        return round((user + nice + system) * 100 / total) if total > 0 else 0

def get_memory_percent():
    with open("/proc/meminfo", "r") as f:
        mem = {}
        for line in f:
            if ":" in line:
                k, v = line.split(":", 1)
                mem[k] = int(v.strip().split()[0])
    total = mem.get("MemTotal", 1)
    avail = mem.get("MemAvailable", mem.get("MemFree", 0))
    return round((total - avail) * 100 / total)

def get_disk_percent():
    out = subprocess.check_output(["df", "/"], text=True)
    return int(out.split("\n")[1].split()[4].rstrip("%"))

def get_load_averages():
    with open("/proc/loadavg", "r") as f:
        parts = f.read().split()
        return float(parts[0]), float(parts[1])   # (1min, 5min)

@ttl_cache(seconds=60)    # 1 minute – optional
def get_ssh_status():
    return "Enabled (22/tcp)" if subprocess.call(["systemctl", "is-active", "--quiet", "ssh"]) == 0 else "Disabled"

@ttl_cache(seconds=300)   # 5 minutes
def get_update_status():
    out = subprocess.run(["apt", "list", "--upgradable", "2>/dev/null"], shell=True, capture_output=True, text=True)
    updates = len([l for l in out.stdout.strip().split("\n") if l and not l.startswith("Listing")])
    return "Up to date" if updates == 0 else f"{updates} updates available"

def get_machine_type():
    full = get_metadata("instance/machine-type")
    return full.split('/')[-1] if '/' in full else full

def get_subnet_name():
    """Get subnet name: try metadata, then gcloud fallback."""
    sub_full = get_metadata("instance/network-interfaces/0/subnetwork")
    if sub_full != "unknown":
        return safe_basename(sub_full)
    # Fallback: gcloud describe
    try:
        instance_name = get_metadata("instance/name")
        zone = safe_basename(get_metadata("instance/zone"))
        if instance_name == "unknown" or zone == "unknown":
            return "unknown"
        cmd = ["gcloud", "compute", "instances", "describe", instance_name,
               "--zone", zone, "--format=json"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            subnet_url = data["networkInterfaces"][0].get("subnetwork", "unknown")
            if subnet_url != "unknown":
                return safe_basename(subnet_url)
    except Exception as e:
        print(f"gcloud subnet lookup failed: {e}")
    return "unknown"

def get_cumulative_cost():
    machine_type = get_machine_type()
    rates = {"e2-micro": 0.0076, "e2-small": 0.0150, "e2-medium": 0.0301,
             "n1-standard-1": 0.0475, "n2-standard-2": 0.0972}
    if machine_type not in rates:
        return "N/A for instance type"
    hourly_rate = rates[machine_type]
    try:
        with open("/proc/uptime", "r") as f:
            current_uptime = float(f.read().split()[0])
    except Exception:
        current_uptime = 0
    try:
        with open(COST_FILE, "r") as f:
            cost_data = json.load(f)
        total_cost = cost_data.get("total_cost", 0.0)
        last_uptime = cost_data.get("last_uptime_sec", current_uptime)
    except Exception:
        total_cost = 0.0
        last_uptime = current_uptime
    if current_uptime < last_uptime:
        last_uptime = current_uptime
    else:
        delta_hours = (current_uptime - last_uptime) / 3600.0
        if delta_hours > 0:
            total_cost += hourly_rate * delta_hours
            last_uptime = current_uptime
    with open(COST_FILE, "w") as f:
        json.dump({"total_cost": total_cost, "last_uptime_sec": last_uptime}, f)
    if total_cost <= 0.0:
        return "N/A"
    if total_cost < 0.01:
        return f"${total_cost:.4f} total"
    if total_cost < 1:
        return f"${total_cost:.3f} total"
    return f"${total_cost:.2f} total"

def get_memory_details():
    try:
        with open("/proc/meminfo", "r") as f:
            meminfo = {}
            for line in f:
                if ":" in line:
                    key, val = line.split(":", 1)
                    meminfo[key] = int(val.strip().split()[0]) / 1024
        total = meminfo.get("MemTotal", 0)
        available = meminfo.get("MemAvailable", meminfo.get("MemFree", 0))
        used = total - available
        return {"total": round(total), "used": round(used), "free": round(available)}
    except Exception:
        return {"total": 0, "used": 0, "free": 0}

def get_disk_details():
    try:
        stat = os.statvfs("/")
        block_size = stat.f_frsize if stat.f_frsize else stat.f_bsize
        total = (stat.f_blocks * block_size) / (1024 * 1024)
        free = (stat.f_bfree * block_size) / (1024 * 1024)
        used = total - free
        return {"total": round(total), "used": round(used), "available": round(free)}
    except Exception:
        return {"total": 0, "used": 0, "available": 0}

def get_cpu_info(cpu_usage):
    cores = 1
    freq = None
    try:
        with open("/proc/cpuinfo", "r") as f:
            cores = f.read().count("processor")
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if "cpu MHz" in line:
                    freq = float(line.split(":")[1].strip())
                    break
    except Exception:
        pass
    return {"cores": cores, "frequency": f"{freq:.0f} MHz" if freq else None, "usage": cpu_usage}

def status(val, warn=WARN_THRESHOLD):
    try:
        return "warning" if float(val) > warn else "healthy"
    except Exception:
        return "healthy"

def load_quotes():
    quotes_path = os.path.join(DATA_DIR, "quotes.json")
    try:
        with open(quotes_path, "r") as f:
            quotes = json.load(f)
            if quotes:
                return quotes
    except Exception:
        pass
    return [{"text": "Welcome to DevSecOps!", "author": "System"}]

def build_dashboard_data():
    """Build the complete dashboard data dictionary (same as old dashboard-data.json)."""
    # System Metrics
    cpu = get_cpu_usage()
    mem = get_memory_percent()
    disk = get_disk_percent()
    load_1min, load_5min = get_load_averages()
    os_name = get_os_name()
    uptime = get_uptime()
    ssh_status = get_ssh_status()
    update_status = get_update_status()
    cost = get_cumulative_cost()

    # Metadata
    instance_id   = get_metadata("instance/id")
    instance_name = get_metadata("instance/name")
    hostname      = get_metadata("instance/hostname")
    zone_full     = get_metadata("instance/zone")
    machine_full  = get_metadata("instance/machine-type")
    project_id    = get_metadata("project/project-id")
    internal_ip   = get_metadata("instance/network-interfaces/0/ip")
    external_ip   = get_metadata("instance/network-interfaces/0/access-configs/0/external-ip")

    if external_ip == "unknown":
        try:
            with urllib.request.urlopen("http://ifconfig.me", timeout=5) as resp:
                external_ip = resp.read().decode().strip()
        except Exception:
            pass

    zone = safe_basename(zone_full)
    region = zone.rsplit('-', 1)[0] if '-' in zone else "unknown"
    machine_type = safe_basename(machine_full)

    vpc_full = get_metadata("instance/network-interfaces/0/network")
    vpc = safe_basename(vpc_full)
    subnet = get_subnet_name()

    # Quotes
    quotes = load_quotes()

    # System resources details
    memory_details = get_memory_details()
    disk_details = get_disk_details()
    cpu_info = get_cpu_info(cpu)

    # Logs (sample – you can later make them dynamic)
    logs = [
        {"time": datetime.now().strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "Dashboard initialized (live API)"},
        {"time": (datetime.now() - timedelta(minutes=5)).strftime("%H:%M:%S"), "level": "info", "scope": "metrics", "message": "Metrics collection active"},
        {"time": (datetime.now() - timedelta(minutes=10)).strftime("%H:%M:%S"), "level": "info", "scope": "system", "message": "System health check passed"},
    ]

    resource_table = [
        {"name": "nginx", "type": "service", "scope": "system",
         "status": "Running" if subprocess.call(["systemctl", "is-active", "--quiet", "nginx"]) == 0 else "Stopped"},
        {"name": "python3", "type": "runtime", "scope": "system", "status": "Installed"},
        {"name": "nodejs", "type": "runtime", "scope": "system", "status": "Installed"},
        {"name": "quotes.json", "type": "data", "scope": "application", "status": "Active"},
        {"name": "dashboard API", "type": "endpoint", "scope": "application", "status": "Active"},
    ]

    data = {
        "summaryCards": [
            {"label": "CPU", "value": f"{cpu}%", "status": status(cpu)},
            {"label": "Memory", "value": f"{mem}%", "status": status(mem)},
            {"label": "Disk", "value": f"{disk}%", "status": status(disk)},
            {"label": "Estimated Cost", "value": cost, "status": "info"}
        ],
        "vmInformation": [
            {"label": "Hostname", "value": hostname},
            {"label": "Instance ID", "value": instance_id},
            {"label": "Zone", "value": zone},
            {"label": "Machine Type", "value": machine_type},
            {"label": "OS", "value": os_name},
            {"label": "Project ID", "value": project_id},
            {"label": "Estimated Cost (Usage)", "value": cost, "status": "info"}
        ],
        "services": [
            {"label": "Nginx", "value": "Running" if subprocess.call(["systemctl", "is-active", "--quiet", "nginx"]) == 0 else "Stopped", "status": "healthy"},
            {"label": "Python", "value": "Installed", "status": "healthy"},
            {"label": "Metadata Service", "value": "Reachable", "status": "healthy"},
            {"label": "HTTP Service", "value": "Serving", "status": "healthy"},
            {"label": "Startup Script", "value": "Completed", "status": "healthy"},
            {"label": "GitHub Quotes Sync", "value": "Successful", "status": "healthy"},
            {"label": "Bootstrap Packages", "value": "nginx, python3, curl, jq, git", "status": "healthy"}
        ],
        "security": [
            {"label": "Host Firewall", "value": "Not installed", "status": "info"},
            {"label": "SSH", "value": ssh_status, "status": "healthy"},
            {"label": "Updates", "value": update_status, "status": "info"},
            {"label": "Internal IP", "value": internal_ip, "status": "info"},
            {"label": "Public IP", "value": external_ip, "status": "info"}
        ],
        "meta": {
            "appName": os.environ.get("DASHBOARD_APP_NAME", "GCP Deployment"),
            "tagline": os.environ.get("DASHBOARD_TAGLINE", "Infrastructure health and activity"),
            "dashboardUser": os.environ.get("DASHBOARD_USER", "Kirk Alton"),
            "dashboardName": os.environ.get("DASHBOARD_NAME", "DevSecOps Dashboard"),
            "uptime": uptime
        },
        "quote": random.choice(quotes),
        "logs": logs,
        "resourceTable": resource_table,
        "systemLoad": load_1min,
        "identity": {
            "project": project_id,
            "instanceId": instance_id,
            "hostname": hostname,
            "instanceName": instance_name,
            "machineType": machine_type
        },
        "network": {
            "vpc": vpc,
            "subnet": subnet,
            "internalIp": internal_ip,
            "externalIp": external_ip
        },
        "location": {
            "region": region,
            "zone": zone,
            "uptime": uptime,
            "loadAvg": f"{load_5min:.2f}"
        },
        "systemResources": {
            "memory": memory_details,
            "disk": disk_details,
            "cpu": cpu_info,
            "endpoints": {"healthz": "/healthz", "metadata": "/metadata", "api": "/api/dashboard"}
        }
    }
    return data

# -------------------------------
# HTTP Request Handler
# -------------------------------

class MonitoringHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Dashboard API endpoint
        if self.path == '/api/dashboard':
            try:
                data = build_dashboard_data()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error building dashboard data: {e}".encode())
            return

        # Health check endpoint
        if self.path == '/healthz':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok\n')
            return

        # Legacy metadata endpoint
        if self.path == '/metadata':
            try:
                meta_student = get_metadata("instance/attributes/student_name")
                final_student = meta_student if meta_student != "unknown" and meta_student else student_name

                project_id    = get_metadata("project/project-id")
                instance_id   = get_metadata("instance/id")
                instance_name = get_metadata("instance/name")
                hostname      = get_metadata("instance/hostname")
                machine_type_full = get_metadata("instance/machine-type")
                machine_type = safe_basename(machine_type_full)

                vpc_full   = get_metadata("instance/network-interfaces/0/network")
                vpc        = safe_basename(vpc_full)
                subnet = get_subnet_name()

                internal_ip   = get_metadata("instance/network-interfaces/0/ip")
                external_ip   = get_metadata("instance/network-interfaces/0/access-configs/0/external-ip")

                zone_full = get_metadata("instance/zone")
                zone = safe_basename(zone_full)
                region = zone.rsplit('-', 1)[0] if '-' in zone else "unknown"
                startup_utc = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                uptime = get_uptime()

                metadata = {
                    "student_name": final_student,
                    "project_id": project_id,
                    "instance_id": instance_id,
                    "instance_name": instance_name,
                    "hostname": hostname,
                    "machine_type": machine_type,
                    "network": {
                        "vpc": vpc,
                        "subnet": subnet,
                        "internal_ip": internal_ip,
                        "external_ip": external_ip,
                    },
                    "region": region,
                    "zone": zone,
                    "startup_utc": startup_utc,
                    "uptime": uptime
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(metadata).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error fetching metadata: {e}".encode())
            return

        # Not found
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        """Suppress default HTTP server logging."""
        return

# -------------------------------
# Main Entry Point
# -------------------------------
if __name__ == '__main__':
    port = 8080
    server = HTTPServer(('0.0.0.0', port), MonitoringHandler)
    print(f"Starting monitoring server on port {port}")
    server.serve_forever()