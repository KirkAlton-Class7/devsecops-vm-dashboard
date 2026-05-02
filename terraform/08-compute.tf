# ----------------------------------------------------------------
# COMPUTE
# ----------------------------------------------------------------

resource "google_compute_instance" "vm_dashboard" {
  name                      = "vm-dashboard"
  machine_type              = "e2-medium"
  zone                      = "us-central1-a"
  allow_stopping_for_update = true

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 20
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.private.id

    # Stable external IP for DNS and Let's Encrypt validation.
    access_config {
      nat_ip = google_compute_address.vm_dashboard.address
    }
  }

  service_account {
    email  = google_service_account.vm_dashboard.email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  # Use startup script file
  metadata_startup_script = file("${path.module}/scripts/gcp_startup.sh")

  metadata = merge(
    {
      dashboard-hostname                    = local.dashboard_fqdn
      letsencrypt-email                     = var.letsencrypt_email
      dashboard-dev-auth-user-secret        = var.dashboard_dev_auth_user_secret_id
      dashboard-dev-auth-password-secret    = var.dashboard_dev_auth_password_secret_id
      dashboard-finops-auth-user-secret     = var.dashboard_finops_auth_user_secret_id
      dashboard-finops-auth-password-secret = var.dashboard_finops_auth_password_secret_id
    }
  )

  # Configuration for template Files
  #   metadata_startup_script = templatefile("${path.module}/templates/gcp_startup.sh.tpl",
  #   {
  #       template_var_1  = value,
  #       template_var_2  = value,
  #       template_var_3  = value,
  #     }
  #   )

  tags = ["ssh", "http", "https", "http-server", "https-server"]

  depends_on = [
    google_compute_subnetwork.private,
    google_compute_router_nat.nat,
    google_compute_address.vm_dashboard
  ]
}


# VM - VM Instance
resource "google_compute_instance" "vm_instance" {
  name                      = "vm-instance"
  machine_type              = "e2-medium"
  zone                      = "us-central1-a"
  allow_stopping_for_update = true # Allows Terraform to stop/start the VM for updates that require a stopped state (avoids recreation when possible)

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 20
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.private.id

    # External IP for SSH (lab simplicity)
    access_config {}
  }

  service_account {
    scopes = ["https://www.googleapis.com/auth/compute.readonly"]
  }

  # Use my custom startup script file
  #metadata_startup_script = file("${path.module}/../scripts/gcp_startup.sh")

  # Use Theo's startup script file
  metadata_startup_script = file("${path.module}/scripts/theos_scripts/userscripts/supera.sh")

  # Configuration for template Files
  #   metadata_startup_script = templatefile("${path.module}/templates/gcp_startup.sh.tpl",
  #   {
  #       template_var_1  = value,
  #       template_var_2  = value,
  #       template_var_3  = value,
  #     }
  #   )

  tags = ["ssh", "http", "http-server"]

  depends_on = [
    google_compute_subnetwork.private,
    google_compute_router_nat.nat
  ]
}
