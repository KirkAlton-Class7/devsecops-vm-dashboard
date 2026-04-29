# ----------------------------------------------------------------
# SERVICE ACCOUNTS - IDENTITY LAYER
# ----------------------------------------------------------------
# REMEMBER:
# Service Accounts = WHO you are
# IAM Roles        = WHAT you can do

# ----------------------------------------------------------------
# SERVICE ACCOUNT - VM DASHBOARD
# ----------------------------------------------------------------
resource "google_service_account" "vm_dashboard" {
  project      = "kirk-devsecops-sandbox" # Replace with your project
  account_id   = "vm-dashboard"
  display_name = "VM Dashboard Service Account"
}

# ----------------------------------------------------------------
# IAM ROLES - VM DASHBOARD PROJECT PERMISSIONS
# ----------------------------------------------------------------
# These roles allow the dashboard VM to read:
# - BigQuery billing export data
# - Cloud Monitoring metrics
# - Recommender insights and recommendations
#
# Keep these read-only where possible.
# ----------------------------------------------------------------

# ----------------------------------------------------------------
# IAM ROLE - COMPUTE VIEWER
# ----------------------------------------------------------------
# Allows the VM dashboard to read instance details (e.g., subnet name)
# via `gcloud compute instances describe` when metadata falls back.
# ----------------------------------------------------------------

resource "google_project_iam_member" "vm_dashboard_compute_viewer" {
  project = "kirk-devsecops-sandbox"
  role    = "roles/compute.viewer"

  member = "serviceAccount:${google_service_account.vm_dashboard.email}"
}

# ----------------------------------------------------------------
# IAM ROLE - BIGQUERY DATA VIEWER
# ----------------------------------------------------------------
# Allows the VM dashboard to read billing export tables.
# Required for actual cost data.
# ----------------------------------------------------------------

resource "google_project_iam_member" "vm_dashboard_bigquery_data_viewer" {
  project = "kirk-devsecops-sandbox" # Replace with your project
  role    = "roles/bigquery.dataViewer"

  member = "serviceAccount:${google_service_account.vm_dashboard.email}"
}

# ----------------------------------------------------------------
# IAM ROLE - BIGQUERY JOB USER
# ----------------------------------------------------------------
# Allows the VM dashboard to run BigQuery jobs.
# Required to query billing export data.
# ----------------------------------------------------------------

resource "google_project_iam_member" "vm_dashboard_bigquery_job_user" {
  project = "kirk-devsecops-sandbox" # Replace with your project
  role    = "roles/bigquery.jobUser"

  member = "serviceAccount:${google_service_account.vm_dashboard.email}"
}

# ----------------------------------------------------------------
# IAM ROLE - MONITORING VIEWER
# ----------------------------------------------------------------
# Allows the VM dashboard to read Cloud Monitoring metrics.
# Required for utilization data like CPU, memory, and resource metrics.
# ----------------------------------------------------------------

resource "google_project_iam_member" "vm_dashboard_monitoring_viewer" {
  project = "kirk-devsecops-sandbox" # Replace with your project
  role    = "roles/monitoring.viewer"

  member = "serviceAccount:${google_service_account.vm_dashboard.email}"
}

# ----------------------------------------------------------------
# IAM ROLE - RECOMMENDER VIEWER
# ----------------------------------------------------------------
# Allows the VM dashboard to read recommender insights.
# Required for rightsizing and savings recommendations.
# ----------------------------------------------------------------

resource "google_project_iam_member" "vm_dashboard_recommender_viewer" {
  project = "kirk-devsecops-sandbox" # Replace with your project
  role    = "roles/recommender.viewer"

  member = "serviceAccount:${google_service_account.vm_dashboard.email}"
}

# ----------------------------------------------------------------
# IAM ROLE - BILLING VIEWER
# ----------------------------------------------------------------
# Grants read-only access to the billing account.
#
# Required for:
# - Billing account metadata
# - Budget definitions
# - Budget thresholds
# - Budget read access through the Budgets API
#
# IMPORTANT:
# There is no separate budget viewer role needed for read-only dashboards.
# roles/billing.viewer includes budget read permissions.
#
# Replace var.billing_account_id with your billing account ID variable,
# or hardcode the billing account ID if that is how your Terraform is set up.
# ----------------------------------------------------------------

resource "google_billing_account_iam_member" "vm_dashboard_billing_viewer" {
  billing_account_id = "01BB2F-8195CD-645BC0" # Replace with your billing account ID
  role               = "roles/billing.viewer"

  member = "serviceAccount:${google_service_account.vm_dashboard.email}"
}