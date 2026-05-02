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

# For billing account ID, the service account needs `roles/billing.viewer` to run `gcloud billing accounts list`.

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

# Grant billing.viewer role if missing (for billing account ID)
# ``` bash
# gcloud projects add-iam-policy-binding $PROJECT_ID \
#   --member="serviceAccount:YOUR_SA@developer.gserviceaccount.com" \
#   --role="roles/billing.viewer"
# ```

import sys
import json
import os
import random
import subprocess
import urllib.request
import concurrent.futures
from google.cloud import monitoring_v3
from google.cloud.monitoring_v3 import Aggregation
from datetime import datetime, timedelta, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from functools import wraps
import time
import threading
import requests

from google.cloud import bigquery

# -------------------------------
# API Customization
# -------------------------------

STUDENT_NAME = "Kirk Alton"

# Your billing account ID (hardcoded for reliability)
BILLING_ACCOUNT_ID = "01BB2F-8195CD-645BC0"

# ---------------------------------------------------------------------------------------------
# !!! END OF CONFIGURATION - DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING !!!
# ---------------------------------------------------------------------------------------------

# -------------------------------
# Constants
# -------------------------------
DATA_DIR = "/var/www/vm-dashboard/data"
COST_FILE = "/var/tmp/vm-cost.json"
CACHE_DIR = os.environ.get("VM_DASHBOARD_CACHE_DIR", "/var/cache/vm-dashboard")
DEVSECOPS_CACHE_FILE = os.path.join(CACHE_DIR, "dashboard.json")
FINOPS_CACHE_FILE = os.path.join(CACHE_DIR, "finops.json")
DEVSECOPS_CACHE_TTL_SECONDS = int(os.environ.get("VM_DASHBOARD_DEVSECOPS_CACHE_TTL", "30"))
FINOPS_CACHE_TTL_SECONDS = int(os.environ.get("VM_DASHBOARD_FINOPS_CACHE_TTL", "600"))
WARN_THRESHOLD = 70

# Global caches
_SUBNET_CACHE = None
_BILLING_ACCOUNT_CACHE = None

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

def read_json_file_cache(path, max_age_seconds=None, allow_stale=False):
    """Read a local JSON cache file if it is fresh enough, or stale reads are allowed."""
    try:
        age_seconds = time.time() - os.path.getmtime(path)
        if not allow_stale and max_age_seconds is not None and age_seconds > max_age_seconds:
            return None

        with open(path, "r", encoding="utf-8") as cache_file:
            cached = json.load(cache_file)

        cached.setdefault("_cache", {})
        cached["_cache"].update({
            "source": "local-file",
            "ageSeconds": round(age_seconds, 2),
            "stale": max_age_seconds is not None and age_seconds > max_age_seconds,
        })
        return cached
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None

def write_json_file_cache(path, payload):
    """Atomically write a local JSON cache file."""
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as cache_file:
            json.dump(payload, cache_file)
        os.replace(tmp_path, path)
    except OSError as exc:
        print(f"Warning: failed to write cache {path}: {exc}", file=sys.stderr)

def get_metadata(path, timeout=2):
    url = f"http://metadata.google.internal/computeMetadata/v1/{path}"
    cmd = ["curl", "-fsS", "-H", "Metadata-Flavor: Google", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        return "unknown"
    except (subprocess.TimeoutExpired, Exception):
        return "unknown"

def format_iso_utc(dt):
    """Return an ISO 8601 UTC timestamp without fractional seconds."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def iso_utc_from_microseconds(ts_micro):
    return format_iso_utc(datetime.fromtimestamp(ts_micro / 1_000_000, tz=timezone.utc))

def safe_basename(full_path):
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
    try:
        result = subprocess.run(["uptime", "-p"], capture_output=True, text=True, timeout=2)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
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

def get_load_avg_string():
    try:
        with open("/proc/loadavg", "r") as f:
            parts = f.read().split()
            return f"{parts[0]} {parts[1]} {parts[2]}"
    except Exception:
        return "0.00 0.00 0.00"

def format_bytes_human(mb):
    if mb >= 1024:
        return f"{mb/1024:.1f}G".rstrip('0').rstrip('.')
    return f"{int(mb)}M"

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
        return float(parts[0]), float(parts[1])

@ttl_cache(seconds=60)
def get_ssh_status():
    return "Enabled (22/tcp)" if subprocess.call(["systemctl", "is-active", "--quiet", "ssh"]) == 0 else "Disabled"

@ttl_cache(seconds=300)
def get_update_status():
    out = subprocess.run(["apt", "list", "--upgradable", "2>/dev/null"], shell=True, capture_output=True, text=True)
    updates = len([l for l in out.stdout.strip().split("\n") if l and not l.startswith("Listing")])
    return "Up to date" if updates == 0 else f"{updates} updates available"

def get_machine_type():
    full = get_metadata("instance/machine-type")
    return full.split('/')[-1] if '/' in full else full

def get_subnet_name():
    global _SUBNET_CACHE
    if _SUBNET_CACHE is not None:
        return _SUBNET_CACHE
    sub_full = get_metadata("instance/network-interfaces/0/subnetwork")
    if sub_full != "unknown":
        _SUBNET_CACHE = safe_basename(sub_full)
        return _SUBNET_CACHE
    try:
        instance_name = get_metadata("instance/name")
        zone = safe_basename(get_metadata("instance/zone"))
        if instance_name == "unknown" or zone == "unknown":
            _SUBNET_CACHE = "unknown"
            return "unknown"
        cmd = ["gcloud", "compute", "instances", "describe", instance_name,
               "--zone", zone, "--format=json"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            subnet_url = data["networkInterfaces"][0].get("subnetwork", "unknown")
            if subnet_url != "unknown":
                _SUBNET_CACHE = safe_basename(subnet_url)
                return _SUBNET_CACHE
    except Exception as e:
        print(f"gcloud subnet lookup failed: {e}", file=sys.stderr)
    _SUBNET_CACHE = "unknown"
    return "unknown"

def get_billing_account_id():
    global _BILLING_ACCOUNT_CACHE
    if _BILLING_ACCOUNT_CACHE is not None:
        return _BILLING_ACCOUNT_CACHE
    try:
        project_number = get_metadata("project/numeric-project-id")
        if project_number == "unknown":
            project_number = get_metadata("project/project-id")
        if project_number == "unknown":
            _BILLING_ACCOUNT_CACHE = ""
            return ""
        cmd = ["gcloud", "billing", "projects", "describe", project_number,
               "--format=value(billingAccountName)"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and result.stdout.strip():
            billing_path = result.stdout.strip()
            billing_id = billing_path.split('/')[-1] if '/' in billing_path else billing_path
            if billing_id:
                _BILLING_ACCOUNT_CACHE = billing_id
                return billing_id
    except Exception as e:
        print(f"gcloud billing lookup failed: {e}", file=sys.stderr)
    _BILLING_ACCOUNT_CACHE = ""
    return ""

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

@ttl_cache(seconds=10)   # cache for 10 seconds
def get_system_logs(limit=30):
    """Fetch real system logs using journalctl."""
    cmd = ["journalctl", "-n", str(limit), "--no-pager", "-o", "json"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        if result.returncode != 0 or not result.stdout.strip():
            return []
        logs = []
        for line in result.stdout.strip().split("\n"):
            try:
                entry = json.loads(line)
                priority = int(entry.get("PRIORITY", 6))
                # Correct mapping:
                # 0-3 -> ERROR, 4 -> WARN, 5-7 -> INFO/DEBUG
                if priority <= 3:
                    level = "ERROR"
                elif priority == 4:
                    level = "WARN"
                else:   # priority 5,6,7 -> INFO or DEBUG
                    level = "INFO"
                ts_micro = int(entry.get("__REALTIME_TIMESTAMP", 0))
                if ts_micro:
                    time_str = iso_utc_from_microseconds(ts_micro)
                else:
                    time_str = format_iso_utc(datetime.now(timezone.utc))
                message = entry.get("MESSAGE", "").strip()
                scope = entry.get("SYSLOG_IDENTIFIER", "system")
                logs.append({
                    "time": time_str,
                    "level": level,
                    "scope": scope[:20],
                    "message": message[:150]
                })
            except json.JSONDecodeError:
                continue
        return logs
    except Exception as e:
        print(f"Error fetching journalctl logs: {e}", file=sys.stderr)
        return []


# Simple time-based cache (can also use @ttl_cache)
_all_logs_cache = None
_all_logs_cache_time = 0
_logs_since_cache = {}
LOGS_SINCE_CACHE_TTL_SECONDS = 5
ALL_LOGS_MAX_LINES = 5000

def _parse_journalctl_logs(raw_output):
    logs = []
    for line in raw_output.strip().split("\n"):
        try:
            entry = json.loads(line)
            priority = int(entry.get("PRIORITY", 6))
            if priority <= 3:
                level = "ERROR"
            elif priority == 4:
                level = "WARN"
            else:
                level = "INFO"
            ts_micro = int(entry.get("__REALTIME_TIMESTAMP", 0))
            if ts_micro:
                time_str = iso_utc_from_microseconds(ts_micro)
            else:
                now_utc = datetime.now(timezone.utc)
                ts_micro = int(now_utc.timestamp() * 1_000_000)
                time_str = format_iso_utc(now_utc)
            message_val = entry.get("MESSAGE", "")
            if isinstance(message_val, str):
                message = message_val.strip()
            else:
                message = str(message_val)[:300]
            source_val = entry.get("SYSLOG_IDENTIFIER", "system")
            if isinstance(source_val, str):
                source = source_val.strip()
            else:
                source = str(source_val)[:20]
            logs.append({
                "time": time_str,
                "_timestamp": ts_micro,
                "level": level,
                "source": source[:20],
                "message": message[:300]
            })
        except json.JSONDecodeError:
            continue
    return logs

def get_all_logs(limit=100, offset=0, minutes=None):
    global _all_logs_cache, _all_logs_cache_time
    journalctl_path = "/usr/bin/journalctl"

    if minutes:
        cache_key = int(minutes)
        cached = _logs_since_cache.get(cache_key)
        if cached and time.time() - cached["time"] <= LOGS_SINCE_CACHE_TTL_SECONDS:
            filtered_logs = cached["logs"]
        else:
            cmd = [
                journalctl_path,
                "--since",
                f"{minutes} minutes ago",
                "--no-pager",
                "-o",
                "json"
            ]
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.returncode != 0 or not result.stdout.strip():
                    filtered_logs = []
                else:
                    filtered_logs = _parse_journalctl_logs(result.stdout)
                _logs_since_cache[cache_key] = {
                    "time": time.time(),
                    "logs": filtered_logs,
                }
            except Exception as e:
                print(f"Error fetching logs since {minutes} minutes ago: {e}", file=sys.stderr)
                filtered_logs = []
    else:
        # Cache unbounded log browsing for 10 seconds.
        if not _all_logs_cache or time.time() - _all_logs_cache_time > 10:
            cmd = [journalctl_path, "-n", str(ALL_LOGS_MAX_LINES), "--no-pager", "-o", "json"]
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.returncode != 0 or not result.stdout.strip():
                    _all_logs_cache = []
                else:
                    _all_logs_cache = _parse_journalctl_logs(result.stdout)
                    _all_logs_cache_time = time.time()
            except Exception as e:
                print(f"Error fetching full logs: {e}", file=sys.stderr)
                _all_logs_cache = []
                _all_logs_cache_time = time.time()

        filtered_logs = _all_logs_cache

    total = len(filtered_logs)
    start = offset
    end = offset + limit
    sliced = filtered_logs[start:end] if start < total else []
    sanitized = [{key: value for key, value in log.items() if key != "_timestamp"} for log in sliced]
    return {
        "logs": sanitized,
        "total": total
    }


# -------------------------------
# Real cost data from BigQuery
# -------------------------------

@ttl_cache(seconds=3600)
def get_billing_table():
    project_id = get_metadata("project/project-id")
    dataset_name = "billing_export"
    if project_id == "unknown":
        return None
    client = bigquery.Client()
    dataset_ref = client.dataset(dataset_name, project=project_id)
    tables = list(client.list_tables(dataset_ref))
    for table in tables:
        if "gcp_billing_export_v1_" in table.table_id:
            return f"{project_id}.{dataset_name}.{table.table_id}"
    return None

# Increased TTL to 1 hour (cost data changes slowly)
@ttl_cache(seconds=3600)
def get_cost_trend(days=30):
    table = get_billing_table()
    if not table:
        return []
    client = bigquery.Client()
    query = f"""
        SELECT DATE(usage_start_time) AS date, SUM(cost) AS total_cost
        FROM `{table}`
        WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)

        GROUP BY date ORDER BY date ASC
    """
    try:
        result = client.query(query).result()
        trend = []
        for row in result:
            trend.append({"date": row.date.strftime("%b %d"), "value": round(row.total_cost, 2)})
        return trend
    except Exception as e:
        print(f"Error fetching cost trend: {e}", file=sys.stderr)
        return []

# Increased TTL to 1 hour
@ttl_cache(seconds=3600)
def get_top_services_by_cost(limit=15):
    table = get_billing_table()
    if not table:
        return []
    client = bigquery.Client()
    query = f"""
        SELECT service.description AS name, SUM(cost) AS total_cost
        FROM `{table}`
        WHERE DATE(usage_start_time) >= DATE_TRUNC(CURRENT_DATE(), MONTH)
        GROUP BY name ORDER BY total_cost DESC LIMIT {limit}
    """
    try:
        result = client.query(query).result()
        services = []
        for row in result:
            services.append({"name": row.name, "value": round(row.total_cost, 2), "status": "info"})
        return services
    except Exception as e:
        print(f"Error fetching top services: {e}", file=sys.stderr)
        return []

# -------------------------------
# FinOps Helper Functions (transformed to match frontend)
# -------------------------------

# CPU utilization changes every few minutes, keep 5 minutes
@ttl_cache(seconds=300)
def get_cpu_utilization_all_vms():
    """Fetch CPU utilisation for all VMs (last hour) and compute P95."""
    project_id = get_metadata("project/project-id")
    if project_id == "unknown":
        return []

    # Get access token
    token = subprocess.run(
        ["gcloud", "auth", "print-access-token"],
        capture_output=True, text=True, check=True
    ).stdout.strip()

    # Build the API URL without aggregation (raw points)
    end_time = datetime.now(timezone.utc).replace(microsecond=0)
    start_time = end_time - timedelta(hours=1)

    params = {
        "filter": 'metric.type="compute.googleapis.com/instance/cpu/utilization"',
        "interval.startTime": format_iso_utc(start_time),
        "interval.endTime": format_iso_utc(end_time)
    }
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries"

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        utilization = []
        for ts in data.get("timeSeries", []):
            instance_id = ts.get("resource", {}).get("labels", {}).get("instance_id", "unknown")
            points = [p.get("value", {}).get("doubleValue", 0) for p in ts.get("points", [])]
            if points:
                # Compute 95th percentile manually
                sorted_vals = sorted(points)
                idx = int(0.95 * len(sorted_vals))
                p95 = sorted_vals[idx] * 100  # convert to percentage
                utilization.append({
                    "instance": instance_id,
                    "cpuP95": round(p95, 1),
                    "recommendationMatch": p95 < 20
                })
        return sorted(utilization, key=lambda x: x["cpuP95"], reverse=True)[:12]
    except Exception as e:
        print(f"Error fetching CPU utilization: {e}", file=sys.stderr)
        return []

# Increased TTL to 1 hour
@ttl_cache(seconds=3600)
def get_rightsizing_recommendations():
    """Return rightsizing recommendations in the shape expected by the frontend."""
    project_id = get_metadata("project/project-id")
    if project_id == "unknown":
        return []
    cmd = [
        "gcloud", "recommender", "recommendations", "list",
        "--project", project_id, "--location=global",
        "--recommender=google.compute.instance.MachineTypeRecommender",
        "--format=json"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return []
        recs = json.loads(result.stdout)
        recommendations = []
        for rec in recs:
            vm_name = rec.get("primaryResourceId", "unknown")
            current_type = rec.get("content", {}).get("overview", {}).get("machineType", "unknown")
            recommended_type = rec.get("content", {}).get("overview", {}).get("recommendedMachineType", "unknown")
            savings = rec.get("primaryImpact", {}).get("costProjection", {}).get("cost", {}).get("amount", 0)
            impact = "HIGH" if savings > 50 else ("MEDIUM" if savings > 20 else "LOW")
            recommendations.append({
                "resource": vm_name,
                "description": f"Resize {current_type} to {recommended_type}",
                "monthlySavings": round(savings, 2),
                "impact": impact,
                "actionUrl": f"https://console.cloud.google.com/compute/instances?project={project_id}"
            })
        return recommendations[:12]
    except Exception as e:
        print(f"Error getting rightsizing recommendations: {e}", file=sys.stderr)
        return []

@ttl_cache(seconds=3600)
def get_idle_resources():
    """Return idle resources in the shape expected by the frontend."""
    project_id = get_metadata("project/project-id")
    if project_id == "unknown":
        return []
    cmd = [
        "gcloud", "recommender", "recommendations", "list",
        "--project", project_id, "--location=global",
        "--recommender=google.compute.instance.IdleResourceRecommender",
        "--format=json"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return []
        recs = json.loads(result.stdout)
        idle = []
        for rec in recs:
            vm_name = rec.get("primaryResourceId", "unknown")
            idle.append({
                "name": vm_name,
                "type": "VM",
                "scope": "compute",
                "status": "warning",
                "cpu": "N/A",
                "recommendation": "Stop or resize if idle"
            })
        return idle[:12]
    except Exception as e:
        print(f"Error getting idle resources: {e}", file=sys.stderr)
        return []

# Increased TTL to 1 hour
@ttl_cache(seconds=3600)
def get_budgets():
    """Return budgets in the shape expected by the frontend."""
    billing_id = BILLING_ACCOUNT_ID
    if not billing_id:
        return []
    cmd = ["gcloud", "billing", "budgets", "list", f"--billing-account={billing_id}", "--format=json"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return []
        budgets = json.loads(result.stdout)
        budget_list = []
        for b in budgets:
            amount = float(b.get("amount", {}).get("specifiedAmount", {}).get("units", 0))
            # The API does not provide spent/forecast; we set placeholders
            # In a real implementation you would query actual spend from BigQuery.
            spent = round(amount * 0.3, 2)   # placeholder
            forecast = round(amount * 1.1, 2) # placeholder
            budget_list.append({
                "name": b.get("displayName", "Unnamed"),
                "amount": amount,
                "spent": spent,
                "forecast": forecast,
                "thresholds": [0.5, 0.8, 0.9]  # default
            })
        return budget_list[:5]
    except Exception as e:
        print(f"Error getting budgets: {e}", file=sys.stderr)
        return []

def get_realized_savings():
    return 0.0

def get_potential_savings():
    recs = get_rightsizing_recommendations()
    idle = get_idle_resources()
    # idle resources don't have savings in the transformed shape, so we sum only rightsizing
    total = sum(r["monthlySavings"] for r in recs)
    return round(total, 2)

# -------------------------------
# Dashboard Data Builder (cached for 10 seconds)
# -------------------------------

@ttl_cache(seconds=10)
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
    billing_account_id = get_billing_account_id()   # cached fetch
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
    
    # Logs – fetch real system logs (fallback to sample if none)
    logs = get_system_logs()
    if not logs:
        now_utc = datetime.now(timezone.utc)
        logs = [
            {"time": format_iso_utc(now_utc), "level": "info", "scope": "system", "message": "Dashboard initialized (live API)"},
            {"time": format_iso_utc(now_utc - timedelta(minutes=5)), "level": "info", "scope": "metrics", "message": "Metrics collection active"},
            {"time": format_iso_utc(now_utc - timedelta(minutes=10)), "level": "info", "scope": "system", "message": "System health check passed"},
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
            "billingAccountId": billing_account_id,
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

def get_cached_dashboard_data():
    """Build live dashboard data, falling back to the last local snapshot on failure."""
    try:
        dashboard_data = build_dashboard_data()
        dashboard_data["_cache"] = {
            "source": "live-refresh",
            "generatedAt": format_iso_utc(datetime.now(timezone.utc)),
            "ttlSeconds": DEVSECOPS_CACHE_TTL_SECONDS,
            "stale": False
        }
        write_json_file_cache(DEVSECOPS_CACHE_FILE, dashboard_data)
        return dashboard_data
    except Exception as exc:
        stale = read_json_file_cache(DEVSECOPS_CACHE_FILE, allow_stale=True)
        if stale:
            print(f"Warning: using stale dashboard cache after refresh failure: {exc}", file=sys.stderr)
            return stale
        raise

# -------------------------------
# Cached FinOps data assembly
# -------------------------------

@ttl_cache(seconds=30)
def get_cached_finops_data():
    """Assemble FinOps data with memory + VM-local file caching."""
    cached = read_json_file_cache(FINOPS_CACHE_FILE, FINOPS_CACHE_TTL_SECONDS)
    if cached:
        return cached

    try:
        # Launch all expensive calls in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_cost = executor.submit(get_cost_trend)
            future_services = executor.submit(get_top_services_by_cost)
            future_idle = executor.submit(get_idle_resources)
            future_rightsize = executor.submit(get_rightsizing_recommendations)
            future_budgets = executor.submit(get_budgets)
            future_util = executor.submit(get_cpu_utilization_all_vms)

            cost_trend = future_cost.result()
            top_services = future_services.result()
            idle_resources = future_idle.result()
            recommendations = future_rightsize.result()
            budgets = future_budgets.result()
            utilization = future_util.result()

        potential_savings = round(sum(r.get("monthlySavings", 0) for r in recommendations), 2)

        summary_cards = [
            {"label": "Total Cost (MTD)", "value": "Protected", "status": "info"},
            {"label": "Forecast (EOM)", "value": "Protected", "status": "warning"},
            {"label": "Potential Savings", "value": f"{potential_savings:.2f}", "status": "healthy"},
            {"label": "CUD Coverage", "value": "N/A", "status": "info"}
        ]

        finops_data = {
            "summaryCards": summary_cards,
            "costTrend": cost_trend,
            "topServices": top_services,
            "budgets": budgets,
            "idleResources": idle_resources,
            "recommendations": recommendations,
            "utilization": utilization,
            "realizedSavings": get_realized_savings(),
            "potentialSavings": potential_savings,
            "quote": random.choice(load_quotes()),
            "_cache": {
                "source": "live-refresh",
                "generatedAt": format_iso_utc(datetime.now(timezone.utc)),
                "ttlSeconds": FINOPS_CACHE_TTL_SECONDS,
                "stale": False
            }
        }
        write_json_file_cache(FINOPS_CACHE_FILE, finops_data)
        return finops_data
    except Exception as exc:
        stale = read_json_file_cache(FINOPS_CACHE_FILE, allow_stale=True)
        if stale:
            print(f"Warning: using stale FinOps cache after refresh failure: {exc}", file=sys.stderr)
            return stale
        raise


def protect_dashboard_summary_cards(cards):
    """Redact protected summary values for the public dashboard endpoint."""
    protected_labels = {"CPU", "Memory", "Disk", "Estimated Cost"}
    protected_cards = []
    for card in cards:
        if card.get("label") in protected_labels:
            protected_cards.append({
                **card,
                "value": "Protected",
                "status": "info"
            })
        else:
            protected_cards.append(card)
    return protected_cards


# -------------------------------
# HTTP Request Handler
# -------------------------------

class MonitoringHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Health check endpoint
        if self.path == '/healthz':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok\n')
            return

        # Metadata endpoint
        if self.path == '/metadata':    
            try:
                # ----- IDENTITY -----
                student_name = get_metadata("instance/attributes/STUDENT_NAME")
                if student_name in ("unknown", ""):
                    print(f"WARNING: STUDENT_NAME metadata not found (got '{student_name}'), using hardcoded fallback '{STUDENT_NAME}'", file=sys.stderr)
                    student_name = STUDENT_NAME

                project_id    = get_metadata("project/project-id")
                instance_id   = get_metadata("instance/id")
                instance_name = get_metadata("instance/name")
                hostname      = get_metadata("instance/hostname")
                machine_type_full = get_metadata("instance/machine-type")
                machine_type = safe_basename(machine_type_full)
                
                # ----- NETWORK -----
                vpc_full   = get_metadata("instance/network-interfaces/0/network")
                vpc        = safe_basename(vpc_full)
                subnet = get_subnet_name()

                internal_ip   = get_metadata("instance/network-interfaces/0/ip")
                external_ip   = get_metadata("instance/network-interfaces/0/access-configs/0/external-ip")
                
                # ----- LOCATION -----
                zone_full = get_metadata("instance/zone")
                zone = safe_basename(zone_full)
                region = zone.rsplit('-', 1)[0] if '-' in zone else "unknown"
                startup_utc = format_iso_utc(datetime.now(timezone.utc))
                uptime = get_uptime()

                # ----- HEALTH -----
                load_avg_str = get_load_avg_string()
                mem = get_memory_details()
                ram_mb = {
                    "used": mem.get("used", 0),
                    "free": mem.get("free", 0),
                    "total": mem.get("total", 0)
                }
                disk = get_disk_details()
                disk_root = {
                    "size": format_bytes_human(disk.get("total", 0)),
                    "used": format_bytes_human(disk.get("used", 0)),
                    "avail": format_bytes_human(disk.get("available", 0)),
                    "use_pct": f"{get_disk_percent()}%"
                }
                
                # ----- BUILD RESPONSE -----
                metadata = {
                    # Identity
                    "STUDENT_NAME": student_name,
                    "project_id": project_id,
                    "instance_id": instance_id,
                    "instance_name": instance_name,
                    "hostname": hostname,
                    "machine_type": machine_type,
                    
                    # Network
                    "network": {
                        "vpc": vpc,
                        "subnet": subnet,
                        "internal_ip": internal_ip,
                        "external_ip": external_ip,
                    },
                    
                    # Location & Uptime
                    "region": region,
                    "zone": zone,
                    "startup_utc": startup_utc,
                    "uptime": uptime,
                    
                    # Health status
                    "health": {
                        "uptime": uptime,
                        "load_avg": load_avg_str,
                        "ram_mb": ram_mb,
                        "disk_root": disk_root
                    }
                }
                
                # ----- SEND SUCCESS RESPONSE -----
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(metadata).encode())

            except Exception as e:
                # ----- SEND ERROR RESPONSE -----
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error fetching metadata: {e}".encode())
            return

        # API Configuration endpoint (static settings)
        if self.path == '/api/config':
            try:
                config = {
                    "allLogsMaxLines": ALL_LOGS_MAX_LINES
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(config).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error: {e}".encode())
            return

        # Public dashboard summary endpoint. Full details are served by /api/dashboard.
        if self.path == '/api/dashboard/summary':
            try:
                data = get_cached_dashboard_data()
                summary = {
                    "summaryCards": protect_dashboard_summary_cards(data.get("summaryCards", [])),
                    "meta": data.get("meta", {}),
                    "systemLoad": data.get("systemLoad"),
                    "_cache": data.get("_cache", {}),
                    "protected": True
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(summary).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error building dashboard summary: {e}".encode())
            return

        # Public FinOps summary endpoint. Full details are served by /api/finops.
        if self.path == '/api/finops/summary':
            try:
                finops_data = get_cached_finops_data()
                summary = {
                    "summaryCards": finops_data.get("summaryCards", []),
                    "identity": finops_data.get("identity", {}),
                    "protected": True
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(summary).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error building FinOps summary: {e}".encode())
            return
        
        # Logs API endpoint with pagination
        if self.path.startswith('/api/logs'):
            try:
                from urllib.parse import urlparse, parse_qs
                query = parse_qs(urlparse(self.path).query)
                limit = int(query.get('limit', [100])[0])
                offset = int(query.get('offset', [0])[0])
                minutes = query.get('minutes', [None])[0]
                minutes = int(minutes) if minutes else None
                
                # Fetch logs (including offset) – returns {'logs': list, 'total': int}
                result = get_all_logs(limit=limit, offset=offset, minutes=minutes)
                logs = result['logs']
                total = result['total']
                has_more = offset + len(logs) < total
                
                response = {
                    "logs": logs,
                    "offset": offset + len(logs),
                    "hasMore": has_more,
                    "total": total
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error fetching logs: {e}".encode())
            return

        # Dashboard API endpoint (cached system data)
        if self.path == '/api/dashboard':
            try:
                data = get_cached_dashboard_data()
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

        # FinOps API endpoint (cached cost data)
        if self.path == '/api/finops':
            try:
                finops_data = get_cached_finops_data()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(finops_data).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(f"Error building FinOps data: {e}".encode())
            return

        # Not found
        self.send_response(404)
        self.end_headers()
        
    def log_message(self, format, *args):
        """Suppress default HTTP server logging."""
        return

def prewarm_cache():
    """Pre‑warm expensive functions so first request is faster."""
    print("Pre‑warming FinOps cache...")
    try:
        get_cached_dashboard_data()
        get_cached_finops_data()
        print("Cache pre‑warmed successfully.")
    except Exception as e:
        print(f"Pre‑warm error: {e}", file=sys.stderr)

# -------------------------------
# Main Entry Point
# -------------------------------
if __name__ == '__main__':
    port = 8080
    server = ThreadingHTTPServer(('0.0.0.0', port), MonitoringHandler)
    server.daemon_threads = True
    
    # Start pre‑warming in a background thread (doesn't block server start)
    threading.Thread(target=prewarm_cache, daemon=True).start()
    
    print(f"Starting monitoring server on port {port}")
    server.serve_forever()
