# ----------------------------------------------------------------
# COMPUTE
# ----------------------------------------------------------------

resource "google_compute_instance" "vm_dashboard" {
  name                      = "basic-vm-dashboard"
  machine_type              = var.machine_type
  zone                      = var.gcp_zone
  allow_stopping_for_update = true
  tags                      = ["ssh", "http", "https", "http-server", "https-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 20
    }
  }

  network_interface {
    network = google_compute_network.main.id

    access_config {
      nat_ip = google_compute_address.vm_dashboard.address
    }
  }

  metadata_startup_script = file("${path.module}/scripts/gcp_startup.sh")

  metadata = {
    dashboard-hostname  = local.dashboard_fqdn
    letsencrypt-email   = var.letsencrypt_email
    letsencrypt-staging = tostring(var.letsencrypt_staging_enabled)
  }

  depends_on = [
    google_compute_network.main,
    google_compute_address.vm_dashboard
  ]
}
