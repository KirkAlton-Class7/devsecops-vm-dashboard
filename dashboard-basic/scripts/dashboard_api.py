#!/usr/bin/env python3

"""Basic VM Dashboard API.

This intentionally avoids privileged Google Cloud APIs. It reads the GCE
metadata server when available and falls back to local Linux files/commands.
"""

import json
import os
import socket
import subprocess
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


APP_NAME = os.environ.get("DASHBOARD_APP_NAME", "Basic VM Dashboard")
DASHBOARD_NAME = os.environ.get("DASHBOARD_NAME", "Basic VM Dashboard")
DASHBOARD_USER = os.environ.get("DASHBOARD_USER", "VM Operator")
TAGLINE = os.environ.get("DASHBOARD_TAGLINE", "Lightweight VM health and metadata")
PORT = int(os.environ.get("PORT", "8080"))


def metadata(path, timeout=1.5):
    url = f"http://metadata.google.internal/computeMetadata/v1/{path}"
    request = urllib.request.Request(url, headers={"Metadata-Flavor": "Google"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8").strip() or "unknown"
    except (urllib.error.URLError, TimeoutError, OSError):
        return "unknown"


def basename(value):
    if not value or value == "unknown":
        return "unknown"
    return value.rstrip("/").split("/")[-1] or "unknown"


def run(command, timeout=2):
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
        if result.returncode == 0:
            return result.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        pass
    return "unknown"


def read_first_line(path, default="unknown"):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return handle.readline().strip() or default
    except OSError:
        return default


def get_cpu_snapshot():
    with open("/proc/stat", "r", encoding="utf-8") as handle:
        parts = handle.readline().split()[1:8]
    values = [int(part) for part in parts]
    idle = values[3] + values[4]
    total = sum(values)
    return idle, total


def get_cpu_percent():
    try:
        idle_a, total_a = get_cpu_snapshot()
        time.sleep(0.12)
        idle_b, total_b = get_cpu_snapshot()
        total_delta = total_b - total_a
        idle_delta = idle_b - idle_a
        if total_delta <= 0:
            return 0
        return round((1 - idle_delta / total_delta) * 100)
    except (OSError, ValueError, ZeroDivisionError):
        return 0


def get_memory():
    values = {}
    try:
        with open("/proc/meminfo", "r", encoding="utf-8") as handle:
            for line in handle:
                key, raw_value = line.split(":", 1)
                values[key] = int(raw_value.strip().split()[0])
    except (OSError, ValueError):
        return {"total": 0, "used": 0, "available": 0, "usage": 0}

    total = round(values.get("MemTotal", 0) / 1024)
    available = round(values.get("MemAvailable", values.get("MemFree", 0)) / 1024)
    used = max(total - available, 0)
    usage = round((used / total) * 100) if total else 0
    return {"total": total, "used": used, "available": available, "usage": usage}


def get_disk():
    try:
        stat = os.statvfs("/")
        total = round((stat.f_blocks * stat.f_frsize) / (1024 * 1024))
        available = round((stat.f_bavail * stat.f_frsize) / (1024 * 1024))
        used = max(total - available, 0)
        usage = round((used / total) * 100) if total else 0
        return {"total": total, "used": used, "available": available, "usage": usage}
    except OSError:
        return {"total": 0, "used": 0, "available": 0, "usage": 0}


def get_uptime():
    pretty = run(["uptime", "-p"])
    if pretty != "unknown":
        return pretty.replace("up ", "", 1)
    try:
        seconds = float(read_first_line("/proc/uptime", "0").split()[0])
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        if days:
            return f"{days} days, {hours} hours"
        if hours:
            return f"{hours} hours, {minutes} minutes"
        return f"{minutes} minutes"
    except (ValueError, IndexError):
        return "unknown"


def get_load_avg():
    try:
        return f"{os.getloadavg()[1]:.2f}"
    except (AttributeError, OSError):
        return "unknown"


def estimate_monthly_cost(machine):
    # Lightweight local estimate only; avoids Cloud Billing APIs for the Basic dashboard.
    normalized = (machine or "").lower()
    monthly = {
        "e2-micro": 6.11,
        "e2-small": 12.23,
        "e2-medium": 24.46,
        "e2-standard-2": 48.92,
        "e2-standard-4": 97.84,
    }
    for key, value in monthly.items():
        if key in normalized:
            return f"{value:.2f}"
    return "N/A"


def get_internal_ip():
    ips = run(["hostname", "-I"])
    if ips != "unknown":
        return ips.split()[0]
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return "unknown"


def get_status(percent):
    if percent >= 90:
        return "critical"
    if percent >= 70:
        return "warning"
    return "healthy"


def machine_type():
    value = metadata("instance/machine-type")
    if value != "unknown":
        return basename(value)
    cpu_model = "unknown"
    try:
        with open("/proc/cpuinfo", "r", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("model name"):
                    cpu_model = line.split(":", 1)[1].strip()
                    break
    except OSError:
        pass
    cores = os.cpu_count() or 1
    return f"{cores} vCPU ({cpu_model})" if cpu_model != "unknown" else f"{cores} vCPU"


def build_dashboard():
    cpu = get_cpu_percent()
    memory = get_memory()
    disk = get_disk()
    zone_path = metadata("instance/zone")
    zone = basename(zone_path)
    region = "-".join(zone.split("-")[:-1]) if zone != "unknown" and "-" in zone else "unknown"
    project = metadata("project/project-id")
    instance_name = metadata("instance/name")
    instance_id = metadata("instance/id")
    hostname = socket.gethostname()
    network = basename(metadata("instance/network-interfaces/0/network"))
    subnet = basename(metadata("instance/network-interfaces/0/subnet"))
    external_ip = metadata("instance/network-interfaces/0/access-configs/0/external-ip")
    machine = machine_type()
    load_avg = get_load_avg()

    return {
        "summaryCards": [
            {"label": "CPU", "value": f"{cpu}%", "status": get_status(cpu)},
            {"label": "Memory", "value": f"{memory['usage']}%", "status": get_status(memory["usage"])},
            {"label": "Disk", "value": f"{disk['usage']}%", "status": get_status(disk["usage"])},
            {"label": "Estimated Cost", "value": estimate_monthly_cost(machine), "status": "info"},
        ],
        "identity": {
            "project": project,
            "instanceId": instance_id,
            "instanceName": instance_name,
            "hostname": hostname,
            "machineType": machine,
            "billingAccountId": "not configured",
        },
        "network": {
            "vpc": network,
            "subnet": subnet,
            "internalIp": get_internal_ip(),
            "externalIp": external_ip,
        },
        "location": {
            "region": region,
            "zone": zone,
            "uptime": get_uptime(),
            "loadAvg": load_avg,
        },
        "systemResources": {
            "cpu": {
                "cores": os.cpu_count() or 1,
                "usage": cpu,
                "frequency": "unknown",
                "loadAvg": load_avg,
                "history": [{"time": datetime.now().strftime("%H:%M"), "value": cpu}],
            },
            "memory": memory,
            "disk": disk,
        },
        "monitoringEndpoints": [
            {"name": "Health Check", "url": "http://localhost/healthz", "status": "up"},
            {"name": "Metadata API", "url": "http://localhost:8080/metadata", "status": "up"},
            {"name": "Dashboard API", "url": "http://localhost:8080/api/dashboard", "status": "up"},
            {"name": "Static Assets", "url": "http://localhost/data/quotes.json", "status": "up"},
        ],
        "services": [
            {"label": "Nginx", "value": f"{service_state('nginx')}; serving dashboard on port 80", "status": service_status("nginx")},
            {"label": "Dashboard API", "value": f"{service_state('dashboard-api')}; basic VM metadata endpoint on port 8080", "status": service_status("dashboard-api")},
            {"label": "React Static Build", "value": "assets present in /var/www/basic-vm-dashboard", "status": "healthy"},
            {"label": "Metadata Service", "value": "best-effort project/zone resolution", "status": "healthy"},
            {"label": "Shared Assets", "value": "quotes and gallery manifest staged from shared/assets", "status": "healthy"},
            {"label": "Startup Script", "value": "ClickOps startup-script friendly", "status": "healthy"},
        ],
        "meta": {
            "appName": APP_NAME,
            "tagline": TAGLINE,
            "dashboardUser": DASHBOARD_USER,
            "dashboardName": DASHBOARD_NAME,
            "uptime": get_uptime(),
            "lastRefresh": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "variant": "basic",
        },
    }


def service_state(name):
    state = run(["systemctl", "is-active", name])
    return state if state != "unknown" else "not reported"


def service_status(name):
    return "healthy" if service_state(name) == "active" else "warning"


class Handler(BaseHTTPRequestHandler):
    def send_payload(self, payload, status=200, content_type="application/json"):
        body = json.dumps(payload).encode("utf-8") if isinstance(payload, (dict, list)) else payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/healthz":
            self.send_payload("ok\n", content_type="text/plain")
            return
        if path in ("/metadata", "/api/dashboard", "/api/dashboard/summary"):
            self.send_payload(build_dashboard())
            return
        self.send_payload({"error": "not found"}, status=404)

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} - {fmt % args}")


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Basic VM Dashboard API listening on {PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
