## **Terraform Service Account – Billing Admin Permissions (One‑Time Setup)**

> **Prerequisite:** You must already have a dedicated Terraform service account (e.g., `terraform-service@PROJECT_ID.iam.gserviceaccount.com`). This runbook grants that account the ability to manage IAM policies on the billing account.

> **Related:** For the full Terraform deployment model, including GCP VM provisioning, AWS Route 53 DNS, HTTPS, Nginx, and Certbot behavior, see [Terraform HTTPS with GCP + Route 53](./HTTPS_SETUP.md).

The Terraform code uses this permission when applying:

```hcl
resource "google_billing_account_iam_member" "vm_dashboard_billing_viewer" {
  billing_account_id = "01BB2F-8195CD-645BC0"
  role               = "roles/billing.viewer"

  member = "serviceAccount:${google_service_account.vm_dashboard.email}"
}
```

The billing account ID is currently set in `terraform/10-service-accounts.tf`; replace it there or refactor it to use `var.billing_account_id` if you deploy in another billing account.

[PICTURE: Screenshot of the Terraform service account details page showing the service account email]

### **Step 1: Set Environment Variables**

Run these commands to automatically retrieve your project ID, billing account ID, and Terraform service account email:

```bash
export PROJECT_ID=$(gcloud config get-value project)
export BILLING_ACCOUNT_ID=$(gcloud billing projects describe ${PROJECT_ID} --format="value(billingAccountName)" | cut -d'/' -f2)
export TERRAFORM_SA_EMAIL="terraform-service@${PROJECT_ID}.iam.gserviceaccount.com"
```

> **Note:** If your Terraform service account has a different name, replace `terraform-service` with the actual account ID.

### **Step 2: Grant `roles/billing.admin` to the Terraform Service Account**

Run the following command (requires your user account to have `billing.admin` on the billing account):

```bash
gcloud billing accounts add-iam-policy-binding ${BILLING_ACCOUNT_ID} \
    --member="serviceAccount:${TERRAFORM_SA_EMAIL}" \
    --role="roles/billing.admin"
```

> **Why this is needed:** Terraform uses this service account to apply IAM bindings on the billing account (e.g., granting `billing.viewer` to the VM dashboard service account).  
> **Note:** This is a **one‑time** operation. Once granted, the Terraform service account retains this permission for all future runs.

[PICTURE: Screenshot of the GCP Billing account IAM page showing the Terraform service account with Billing Admin]

### **Verification**

```bash
gcloud beta billing accounts get-iam-policy ${BILLING_ACCOUNT_ID} --format=json | grep -A2 terraform-service
```

Expected output includes `"role": "roles/billing.admin"`.
