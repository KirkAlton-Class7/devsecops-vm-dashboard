#!/usr/bin/env python3
"""
Monitoring server for GCP VM metadata and health checks.
Serves /healthz (plain text) and /metadata (JSON).
"""

import json
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

student_name = "Kirk Alton"

def get_metadata(path, timeout=2):
    """
    Fetch a specific metadata value from the GCE metadata server.
    Uses subprocess.run with timeout and error handling.
    """
    url = f"http://metadata.google.internal/computeMetadata/v1/{path}"
    cmd = ["curl", "-s", "-H", "Metadata-Flavor: Google", url]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        else:
            return "unknown"
    except subprocess.TimeoutExpired:
        return "unknown"
    except Exception:
        return "unknown"


def safe_basename(full_path):
    """Extract last component of a resource path (e.g., projects/123/networks/default -> default)."""
    if not full_path or full_path == "unknown":
        return full_path
    return full_path.split('/')[-1]


def get_uptime():
    """Return human-readable uptime (e.g., 'up 2 hours, 3 minutes')."""
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
            elif hours > 0:
                return f"up {hours} hour{'s' if hours != 1 else ''}, {minutes} minute{'s' if minutes != 1 else ''}"
            else:
                return f"up {minutes} minute{'s' if minutes != 1 else ''}"
    except Exception:
        return "unknown"


class MonitoringHandler(BaseHTTPRequestHandler):
    """
    Handles HTTP GET requests for /healthz and /metadata.
    """

    def do_GET(self):
        # Health endpoint
        if self.path == '/healthz':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')

        # Metadata endpoint
        elif self.path == '/metadata':
            try:
                # ----- Student Name -----
                student_name  = get_metadata("instance/attributes/student_name")
                if student_name == "unknown" or not student_name:
                    student_name = "Anonymous Student (who are you?)"
                
                # ----- Prroject & VM Identity -----
                project_id    = get_metadata("project/project-id")
                instance_id   = get_metadata("instance/id")
                instance_name = get_metadata("instance/name")
                hostname      = get_metadata("instance/hostname")
                # Machine Type
                machine_type_full = get_metadata("instance/machine-type")
                machine_type = safe_basename(machine_type_full)

                # ----- Network -----
                vpc_full   = get_metadata("instance/network-interfaces/0/network")
                vpc        = safe_basename(vpc_full)

                subnet_full = get_metadata("instance/network-interfaces/0/subnetwork")
                subnet     = safe_basename(subnet_full)

                internal_ip   = get_metadata("instance/network-interfaces/0/ip")
                external_ip   = get_metadata("instance/network-interfaces/0/access-configs/0/external-ip")

                # ----- Location & Uptime -----
                zone_full = get_metadata("instance/zone")
                zone = safe_basename(zone_full)

                region = zone.rsplit('-', 1)[0] if '-' in zone else "unknown"
                
                startup_utc   = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")                
                uptime = get_uptime()

                # ----- Build JSON response -----
                metadata = {
                    # Student Name
                    "student_name": student_name,

                    # Project & VM Identity
                    "project_id": project_id,
                    "instance_id": instance_id,
                    "instance_name": instance_name,
                    "hostname": hostname,
                    "machine_type": machine_type,

                    # Network
                    "network":{
                        "vpc": vpc,
                        "subnet": subnet,
                        "internal_ip": internal_ip,
                        "external_ip": external_ip,
                        },
                    
                    # Location & Uptime
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

        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Suppress default HTTP server logging."""
        return


if __name__ == '__main__':
    port = 8080
    server = HTTPServer(('0.0.0.0', port), MonitoringHandler)
    print(f"Starting monitoring server on port {port}")
    server.serve_forever()