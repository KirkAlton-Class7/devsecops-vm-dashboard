# ----------------------------------------------------------------
# ENABLE REQUIRED GCP APIS
# ----------------------------------------------------------------

resource "google_project_service" "compute" {
  project            = "kirk-devsecops-sandbox"
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}
