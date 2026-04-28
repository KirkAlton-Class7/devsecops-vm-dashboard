# VM Dashboard

A real‑time infrastructure and cost monitoring dashboard that deploys automatically on **GCP**.

It provides live system data and metrics for **DevSecOps**, and includes a mode with **FinOps insights** (cost trends, budgets, rightsizing, idle resources). Both dashboard modes include a particle screensaver, an international photo gallery, inspirational quotes, and a terminal‑style text mode.

Provides:

* System metrics (CPU, memory, disk, load, uptime)
* **FinOps insights** (BigQuery cost trends, budgets, rightsizing, idle resources)
* API-driven observability with paginated system logs
* Sort, filter, search, and view-all workflows for logs, services, and FinOps lists
* Lightweight UI modes (terminal + visual)

DevSecOps system health is collected locally from the VM and GCP metadata. FinOps data uses GCP APIs and BigQuery billing export when configured.

---

## Documentation

All detailed setup and configuration lives in `docs/`. Review in this order:

1. **[Features and Roadmap](./docs/FEATURES.md)** – capabilities (DevSecOps + FinOps)
2. **[Prerequisites](./docs/PREREQUISITES.md)** – IAM, APIs, billing export, service accounts
3. **[API Configuration](./docs/API_CONFIG.md)** – `scripts/dashboard_api.py` settings (IDs, TTLs, flags)
4. **[App Configuration](./docs/APP_CONFIG.md)** – bootstrap + UI settings
5. **[Quick Start](./docs/QUICKSTART.md)** – deploy VM → run → access dashboard

> Full FinOps requires **BigQuery billing export + proper IAM**.
> Without it, FinOps API sections return empty values; the React FinOps view falls back to bundled mock data only when the API request fails.

---

## Quick Reference

* **Endpoints**

  * `/healthz` – health check
  * `/metadata` – instance info
  * `/api/dashboard` – infra metrics
  * `/api/finops` – cost + optimization data
  * `/api/config` – static API settings
  * `/api/logs` – paginated journal logs with `limit`, `offset`, and optional `minutes`

* **Repository**
  [https://github.com/KirkAlton-Class7/devsecops-vm-dashboard](https://github.com/KirkAlton-Class7/devsecops-vm-dashboard)

* **License**
  MIT

---

## License

MIT – free to use, modify, and distribute.
