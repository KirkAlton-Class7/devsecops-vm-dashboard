# ----------------------------------------------------------------
# DNS
# ----------------------------------------------------------------

resource "aws_route53_zone" "vm_dashboard" {
  count = var.manage_route53_in_terraform ? 1 : 0

  name = local.root_domain
}

data "aws_route53_zone" "vm_dashboard" {
  count = var.create_route53_record && !var.manage_route53_in_terraform ? 1 : 0

  name         = local.route53_zone_name
  private_zone = var.route53_private_zone
}

resource "aws_route53_record" "vm_dashboard" {
  count = var.create_route53_record ? 1 : 0

  allow_overwrite = true
  zone_id         = local.route53_zone_id
  name            = local.dashboard_fqdn
  type            = "A"
  ttl             = 300
  records         = [google_compute_address.vm_dashboard.address]
}
