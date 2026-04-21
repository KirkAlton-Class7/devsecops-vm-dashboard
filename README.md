---

# VM Dashboard (DevSecOps + FinOps)

A self-hosted dashboard for **real-time infrastructure monitoring and cost visibility** on **GCP**.

Provides:

* System metrics (CPU, memory, disk)
* **FinOps insights** (cost trends, budgets, rightsizing, idle resources)
* API-driven observability
* Lightweight UI modes (terminal + visual)

No external monitoring services required.

---

## Documentation

All detailed setup and configuration lives in `docs/`. Review in this order:

1. **[Features](./docs/FEATURES.md)** – capabilities (DevSecOps + FinOps)
2. **[Prerequisites](./docs/PREREQUISITES.md)** – IAM, APIs, billing export, service accounts
3. **[API Configuration](./docs/API_CONFIG.md)** – `dashboard_api.py` settings (IDs, TTLs, flags)
4. **[App Configuration](./docs/APP_CONFIG.md)** – bootstrap + UI settings
5. **[Quick Start](./docs/QUICKSTART.md)** – deploy VM → run → access dashboard

> Full FinOps requires **BigQuery billing export + proper IAM**.
> Without it, the dashboard runs with mock data.

---

## Quick Reference

* **Endpoints**

  * `/healthz` – health check
  * `/metadata` – instance info
  * `/api/dashboard` – infra metrics
  * `/api/finops` – cost + optimization data

* **Repository**
  [https://github.com/KirkAlton-Class7/devsecops-vm-dashboard](https://github.com/KirkAlton-Class7/devsecops-vm-dashboard)

* **License**
  MIT

---

## License

MIT – free to use, modify, and distribute.