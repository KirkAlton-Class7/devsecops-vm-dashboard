# ----------------------------------------------------------------
# STATIC IP
# ----------------------------------------------------------------

resource "google_compute_address" "vm_dashboard" {
  name   = "vm-dashboard-ip"
  region = "us-central1"

  depends_on = [
    google_project_service.compute
  ]
}
