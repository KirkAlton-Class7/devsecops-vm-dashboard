#!/usr/bin/env python3
import json
import os
import subprocess
import urllib.request
from datetime import datetime

DATA_DIR = os.environ.get('DATA_DIR', '/var/www/vm-dashboard/data')
CACHE_FILE = f"{DATA_DIR}/pricing_cache.json"

CACHE_FILE = "/var/www/devsecops-sandbox/data/pricing_cache.json"

# ------------------------------------------------------------
# 1. AWS Pricing (using AWS CLI – fast & filtered)
# ------------------------------------------------------------
def get_aws_price(instance_type, region):
    """Return hourly on‑demand price for a given AWS instance type and region."""
    # Example: instance_type = "t3.micro", region = "us-west-2"
    try:
        cmd = [
            "aws", "pricing", "get-products",
            "--service-code", "AmazonEC2",
            "--filters",
            f"Type=TERM_MATCH,Field=instanceType,Value={instance_type}",
            f"Type=TERM_MATCH,Field=location,Value={region}",
            "Type=TERM_MATCH,Field=operatingSystem,Value=Linux",
            "--region", "us-east-1"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return None
        data = json.loads(result.stdout)
        for price_item in data.get("PriceList", []):
            obj = json.loads(price_item)
            terms = obj["terms"]["OnDemand"]
            for term in terms.values():
                for dim in term["priceDimensions"].values():
                    return float(dim["pricePerUnit"]["USD"])
    except Exception:
        pass
    return None

# ------------------------------------------------------------
# 2. GCP Pricing (using public API – filtered by machine type)
# ------------------------------------------------------------
def get_gcp_price(machine_type, region):
    """Return hourly price for a GCP machine type in a given region."""
    # GCP pricing API is complex; we use a known static mapping for common types.
    # For production, you could parse the official JSON (but it's huge).
    # Here we define a small fallback map.
    pricing = {
        "e2-micro": 0.008,
        "e2-small": 0.017,
        "e2-medium": 0.034,
        "e2-standard-2": 0.067,
        "e2-standard-4": 0.134,
    }
    # Region multipliers (approximate)
    region_multiplier = {
        "us-central1": 1.0,
        "us-west1": 0.98,
        "europe-west1": 1.05,
        "asia-east1": 1.08,
    }
    base = pricing.get(machine_type, 0.015)
    mult = region_multiplier.get(region, 1.0)
    return round(base * mult, 4)

# ------------------------------------------------------------
# 3. Azure Pricing (using Azure Retail Prices API – filtered)
# ------------------------------------------------------------
def get_azure_price(machine_type, region):
    """Return hourly price for an Azure VM series in a region."""
    # Azure API: https://prices.azure.com/api/retail/prices
    # For simplicity, we use a static map; you can extend with a real API call.
    pricing = {
        "B1ls": 0.005,
        "B1s": 0.010,
        "B1ms": 0.020,
        "D2v3": 0.096,
        "D4v3": 0.192,
    }
    return pricing.get(machine_type, 0.015)

# ------------------------------------------------------------
# 4. Main: gather pricing for all machine types you use
# ------------------------------------------------------------
def build_cache():
    # Define the machine types and regions you actually have
    # (you can read these from your VM metadata or hardcode)
    machines = {
        "aws": {
            "us-west-2": ["t3.micro", "t3.small", "t3.medium"],
        },
        "gcp": {
            "us-central1": ["e2-micro", "e2-small", "e2-medium", "e2-standard-2"],
        },
        "azure": {
            "westus2": ["B1ls", "B1s", "B1ms"],
        }
    }

    cache = {
        "last_updated": datetime.utcnow().isoformat(),
        "pricing": {}
    }

    # AWS
    for region, types in machines["aws"].items():
        for instance in types:
            price = get_aws_price(instance, region)
            if price:
                cache["pricing"][f"aws:{region}:{instance}"] = price

    # GCP
    for region, types in machines["gcp"].items():
        for instance in types:
            price = get_gcp_price(instance, region)
            cache["pricing"][f"gcp:{region}:{instance}"] = price

    # Azure
    for region, types in machines["azure"].items():
        for instance in types:
            price = get_azure_price(instance, region)
            cache["pricing"][f"azure:{region}:{instance}"] = price

    # Write cache
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

    print(f"Pricing cache written to {CACHE_FILE}")

if __name__ == "__main__":
    build_cache()