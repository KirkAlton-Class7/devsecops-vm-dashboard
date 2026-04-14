#!/usr/bin/env python3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess


# If health/metadata routes are served upstream (e.g., NGINX),
# these handlers are bypassed and not invoked by the application.
# Logic is retained for fallback and debug scenarios.

class MonitoringHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/healthz':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        elif self.path == '/metadata':
            # Fetch metadata from the GCE metadata server
            try:
                # Get instance ID
                instance_id = subprocess.getoutput("curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/id")
                # Get hostname
                hostname = subprocess.getoutput("curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/hostname")
                # Get machine type
                machine_type = subprocess.getoutput("curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/machine-type")
                # Get internal IP
                internal_ip = subprocess.getoutput("curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip")
                # Get external IP
                external_ip = subprocess.getoutput("curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip")
                
                metadata = {
                    "instance_id": instance_id,
                    "hostname": hostname,
                    "machine_type": machine_type.split('/')[-1], # Extract just the type name
                    "internal_ip": internal_ip,
                    "external_ip": external_ip
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
        # Suppress default logging to keep console clean
        return

if __name__ == '__main__':
    port = 8080  # Use port 80 for simplicity (requires root)
    server = HTTPServer(('0.0.0.0', port), MonitoringHandler)
    print(f"Starting monitoring server on port {port}")
    server.serve_forever()