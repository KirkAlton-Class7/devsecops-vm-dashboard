# ----------------------------------------------------------------
# VPC
# ----------------------------------------------------------------

resource "google_compute_network" "main" {
  name                    = "${local.name_prefix}-net"
  auto_create_subnetworks = true
  mtu                     = 1460

  depends_on = [google_project_service.compute]
}
