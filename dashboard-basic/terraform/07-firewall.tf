# ----------------------------------------------------------------
# Firewall Rule — Basic VM Dashboard
# ----------------------------------------------------------------

resource "google_compute_firewall" "vm_dashboard" {
  name    = "${local.name_prefix}-vm-dashboard"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["vm-dashboard"]
}
