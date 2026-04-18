#!/usr/bin/env python3
"""
Monitoring server for GCP VM metadata and health checks.
Serves /healthz (plain text) and /metadata (JSON).
"""

import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess


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
            check=False          # Don't raise on non-zero exit – we'll handle manually
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        else:
            return "unknown"
    except subprocess.TimeoutExpired:
        return "unknown"
    except Exception:
        return "unknown"


def build_finops_data():
    """Return mock FinOps data (cost trends, idle resources, recommendations)."""
    return {
        "summaryCards": [
            {"label": "Total Cost (MTD)", "value": "$124.50", "status": "info"},
            {"label": "Forecast (EOM)", "value": "$158.20", "status": "warning"},
            {"label": "Potential Savings", "value": "$23.70", "status": "healthy"},
            {"label": "CUD Coverage", "value": "68%", "status": "healthy"},
        ],
        "costTrend": [
            {"date": "Mar 20", "value": 12.3},
            {"date": "Mar 21", "value": 11.8},
            {"date": "Mar 22", "value": 13.1},
            {"date": "Mar 23", "value": 10.5},
            {"date": "Mar 24", "value": 12.9},
            # ... add more days as needed
        ],
        "topServices": [
            {"name": "Compute Engine", "value": "$87.20", "status": "info"},
            {"name": "Cloud Storage", "value": "$23.50", "status": "info"},
            {"name": "BigQuery", "value": "$8.90", "status": "info"},
            {"name": "Cloud Run", "value": "$4.20", "status": "info"},
        ],
        "idleResources": [
            {"name": "dev-vm-01", "type": "n1-standard-1", "cpu": "2%", "recommendation": "Stop or resize"},
            {"name": "unused-ip-1", "type": "External IP", "cpu": "N/A", "recommendation": "Release"},
            {"name": "old-snapshot-2024", "type": "Snapshot", "cpu": "N/A", "recommendation": "Delete"},
        ],
        "recommendations": [
            {"instance": "db-server", "current": "n2-standard-4", "suggested": "n2-standard-2", "savings": "$45/mo"},
            {"instance": "web-server-01", "current": "e2-standard-2", "suggested": "e2-standard-1", "savings": "$22/mo"},
        ]
    }

class MonitoringHandler(BaseHTTPRequestHandler):
    """
    Handles HTTP GET requests for /healthz and /metadata.
    """

    def do_GET(self):
        # -------------------------------------------------
        # 1) Health endpoint – returns "OK" (plain text)
        # -------------------------------------------------
        if self.path == '/healthz':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')

        # -------------------------------------------------
        # 2) Metadata endpoint – returns VM info as JSON
        # -------------------------------------------------
        elif self.path == '/metadata':
            try:
                # ----- Core identity + naming -----
                instance_id   = get_metadata("instance/id")
                instance_name = get_metadata("instance/name")
                hostname      = get_metadata("instance/hostname")

                # ----- Infrastructure details -----
                machine_type_full = get_metadata("instance/machine-type")
                machine_type = machine_type_full.split('/')[-1] if '/' in machine_type_full else machine_type_full

                internal_ip   = get_metadata("instance/network-interfaces/0/ip")
                external_ip   = get_metadata("instance/network-interfaces/0/access-configs/0/external-ip")

                # ----- Region parsing -----
                zone_full = get_metadata("instance/zone")
                zone = zone_full.split('/')[-1] if '/' in zone_full else zone_full
                region = zone.rsplit('-', 1)[0] if '-' in zone else "unknown"

                # ----- Build JSON response -----
                metadata = {
                    "instance_id": instance_id,
                    "instance_name": instance_name,
                    "hostname": hostname,
                    "machine_type": machine_type,
                    "internal_ip": internal_ip,
                    "external_ip": external_ip,
                    "region": region
                }

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(metadata).encode())

            except Exception as e:
                # Catch-all for any unexpected errors
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error fetching metadata: {e}".encode())

        # Inside MonitoringHandler.do_GET
        if self.path == '/api/finops':
            data = build_finops_data()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
            return
        
        # -------------------------------------------------
        # 3) 404 for any other path
        # -------------------------------------------------
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Suppress default HTTP server logging (clean console output)."""
        return


if __name__ == '__main__':
    port = 8080
    server = HTTPServer(('0.0.0.0', port), MonitoringHandler)
    print(f"Starting monitoring server on port {port}")
    server.serve_forever()