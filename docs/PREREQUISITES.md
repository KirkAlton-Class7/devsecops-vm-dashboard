# **Prerequisites Setup for FinOps Dashboard**

## **Purpose**

This runbook defines all prerequisite configuration required **before** deploying the VM dashboard infrastructure. It ensures a dedicated service account is created, properly permissioned, and ready to be attached **at VM deployment time** (covered in a separate runbook).

---

## **What This Enables in the Dashboard**

| Dashboard Feature | Required Permission / API | Enabled by Step |
|------------------|---------------------------|----------------|
| **Real cost data** (BigQuery) | `bigquery.dataViewer`, `bigquery.jobUser` | 3.2 |
| **Budgets & alerts** | `billing.viewer`, `billingbudgets.googleapis.com` | 3.1, 1 |
| **CPU utilization** (per VM) | `monitoring.viewer`, `monitoring.googleapis.com` | 3.2, 1 |
| **Rightsizing recommendations** | `recommender.computeViewer`, `recommender.googleapis.com` | 3.2, 1 |
| **Cost trends & forecasts** | BigQuery billing export | 4 |
| **Idle resources** | `recommender.computeViewer` | 3.2 |
| **Service account identity** | Custom SA created | 2.1 |

---

## **Prerequisites**

- Installed and authenticated Google Cloud SDK (`gcloud auth login`)
- Active GCP project with billing enabled
- **Required IAM roles** (temporary, for setup):
  - `roles/billing.admin` (on the billing account)
  - `roles/owner` (on the project)

---

## **Stage 1: Enable Required APIs**

```bash
gcloud services enable \
  cloudbilling.googleapis.com \
  billingbudgets.googleapis.com \
  recommender.googleapis.com \
  monitoring.googleapis.com \
  bigquery.googleapis.com \
  cloudquotas.googleapis.com
```

> **Note:** This step is required once per project. If any API fails, check your project owner permissions.

---

## **Stage 2: Create Service Account & Set Variables**

### **2.1 Create a Dedicated Service Account**

```bash
export PROJECT_ID="kirk-devsecops-sandbox"   # Replace with your project ID

gcloud iam service-accounts create vm-dashboard \
  --project=${PROJECT_ID} \
  --display-name="VM Dashboard Service Account"
```

> **Result:** `vm-dashboard@${PROJECT_ID}.iam.gserviceaccount.com`

### **2.2 Set Environment Variables**

```bash
export BILLING_ACCOUNT_ID="01BB2F-8195CD-645BC0"   # Your billing account ID
export SA_EMAIL="vm-dashboard@${PROJECT_ID}.iam.gserviceaccount.com"
```

> **Why a custom SA?**<br>
> Using the default Compute Engine service account is **not recommended** for production. A dedicated SA improves audit clarity and follows least privilege.

---

## **Stage 3: Assign IAM Permissions and Roles**

### **3.1 Billing Account (for Budgets & Cost data)**

```bash
gcloud beta billing accounts add-iam-policy-binding ${BILLING_ACCOUNT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/billing.viewer"
```

**Enables:** Budgets, billing account metadata, cost data (via BigQuery export)

> **Note**: Budgets API read access is included in roles/billing.viewer. <br>
No additional role is required for listing or viewing budgets within the billing account.


### **3.2 Project-Level Roles**

```bash
# Compute Viewer – subnet name retrieval (DevSecOps network card)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/compute.viewer"
    
# BigQuery Data Viewer – read billing export tables
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.dataViewer"

# BigQuery Job User – run queries
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.jobUser"

# Monitoring Viewer – CPU utilization metrics
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/monitoring.viewer"

# Recommender Compute Viewer – rightsizing & idle resources
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/recommender.computeViewer"
```

> **Enables:** BigQuery cost queries, CPU utilization metrics, rightsizing & idle resource recommendations.

---

## **Stage 4: Configure Billing Export to BigQuery**

> **Required for real cost data.** Without this, the dashboard will show empty cost trends.

### **4.1 Console Method (Recommended)**

1. Go to **Billing** → **BigQuery Export**
2. Click **Edit settings**
3. Choose your project (`${PROJECT_ID}`) and dataset name `billing_export`
4. Click **Save**

> **Warning:** Enabling Cloud Billing export to BigQuery can only be done through the GCP Console UI. There is no gcloud CLI command or stable REST API endpoint to configure it, so the`/v1/billingAccounts/{id}/exportSettings` endpoint returns 404. There is no Terraform resource for this either.

> **Important:** After enabling, data appears within **24 hours**. The dashboard will show `[]` (empty) until then.

---

## **Stage 5: Verify Permissions**

Run these commands to confirm permissions are correct.

```bash
# 1. Verify Service Account Exists
gcloud iam service-accounts list --filter="email:${SA_EMAIL}"

# 2. Project IAM Roles (all five expected roles)
gcloud projects get-iam-policy ${PROJECT_ID} --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:${SA_EMAIL}"

# 3. Billing Account IAM (roles/billing.viewer)
gcloud beta billing accounts get-iam-policy ${BILLING_ACCOUNT_ID} --format=json | grep -A2 ${SA_EMAIL}

# 4. Required APIs Enabled
gcloud services list --enabled --filter="cloudbilling.googleapis.com OR billingbudgets.googleapis.com OR recommender.googleapis.com OR monitoring.googleapis.com OR bigquery.googleapis.com"

# 5. BigQuery Billing Export Dataset Exists
bq ls billing_export 2>/dev/null || echo "Dataset not found"

# 6. BigQuery Access (dry run query)
bq query --use_legacy_sql=false --dry_run "SELECT 1"

# 7. Recommender API Access
gcloud recommender recommendations list --project=${PROJECT_ID} --location=global --recommender=google.compute.instance.MachineTypeRecommender --limit=1

# 8. Budgets API Access
gcloud beta billing budgets list --billing-account=${BILLING_ACCOUNT_ID}

```

> **Warning: gcloud does not support Monitoring time series queries. Use the Monitoring API via curl.

```bash
# 9. Monitoring API access (may return empty array)

# 10a. Linux (GNU date):
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
"https://monitoring.googleapis.com/v3/projects/$PROJECT_ID/timeSeries?filter=metric.type=\"compute.googleapis.com/instance/cpu/utilization\"&interval.endTime=$(date -u +"%Y-%m-%dT%H:%M:%SZ")&interval.startTime=$(date -u -d '1 hour ago' +"%Y-%m-%dT%H:%M:%SZ")"

# 10b. macOS (BSD date):
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
"https://monitoring.googleapis.com/v3/projects/$PROJECT_ID/timeSeries?filter=metric.type=\"compute.googleapis.com/instance/cpu/utilization\"&interval.endTime=$(date -u +"%Y-%m-%dT%H:%M:%SZ")&interval.startTime=$(date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ")"

# 1oc. Windows (PowerShell):
$end = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$start = (Get-Date).ToUniversalTime().AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ssZ")
$token = gcloud auth print-access-token

curl -H "Authorization: Bearer $token" "https://monitoring.googleapis.com/v3/projects/$env:PROJECT_ID/timeSeries?filter=metric.type=""compute.googleapis.com/instance/cpu/utilization""&interval.endTime=$end&interval.startTime=$start"
```
> **Note:** Warning: Errors indicating the absence of a gcloud command for Monitoring time series do not indicate missing permissions. Successful API calls (no 401/403) confirm access.
---

## **Stage 6: Pre-Deployment Checklist**

- [ ] Service account created
- [ ] IAM roles assigned
- [ ] APIs enabled
- [ ] BigQuery billing export configured
- [ ] API access verified


**Next step:** Use the **[Quick Start](./QUICKSTART.md)** runbook to create the VM and **attach the service account at creation time**.

> **Crucial:** Do not create the VM before setting up this service account. The service account should be attached **during VM creation** to avoid unnecessary troubleshooting or reconfiguration.

---

## **Troubleshooting & Notes**

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| `billing budgets list` returns empty | No budgets created yet | Create a budget in GCP Console → Billing → Budgets |
| CPU utilization stays `[]` | VM just started or Monitoring API not enabled | Wait 5–10 minutes; verify API enabled (`gcloud services list --enabled`) |
| Cost trends empty after 24h | BigQuery export not configured | Re‑run Stage 4 or check Billing → BigQuery Export settings |
| Terraform fails on `google_billing_account_iam_member` | Your Terraform user lacks `billing.admin` | Run `gcloud billing accounts add-iam-policy-binding ... --role="roles/billing.admin"` for your user, or remove the billing IAM resource from Terraform |

---

## **Cleanup (Optional)**

```bash
# Remove IAM bindings
gcloud projects remove-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.dataViewer"

# Delete service account
gcloud iam service-accounts delete ${SA_EMAIL}

# Unset variables
unset PROJECT_ID BILLING_ACCOUNT_ID SA_EMAIL
```

---

## **Key Takeaways**

- **Create the service account first**, then attach it during VM creation.
- **Use least privilege**; custom SA with only `billing.viewer` and project‑level read roles.
- **Billing export takes up to 24 hours**. The dashboard will not show cost data until then.
- **Budgets API is included in `billing.viewer`**. No extra role needed for read‑only access.

---

## **References**

- [GCP Billing IAM roles](https://cloud.google.com/billing/docs/how-to/billing-access)
- [BigQuery billing export setup](https://cloud.google.com/billing/docs/how-to/export-data-bigquery-setup)
- [Cloud Monitoring metrics list](https://cloud.google.com/monitoring/api/metrics_gcp)
