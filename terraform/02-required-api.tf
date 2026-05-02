# ----------------------------------------------------------------
# ENABLE REQUIRED GCP APIS - PLATFORM LAYER
# ----------------------------------------------------------------

resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "bigquery.googleapis.com",
    "billingbudgets.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "recommender.googleapis.com",
    "cloudbilling.googleapis.com",
    "secretmanager.googleapis.com"
  ])

  project = "kirk-devsecops-sandbox"
  service = each.value

  disable_on_destroy = false
}
