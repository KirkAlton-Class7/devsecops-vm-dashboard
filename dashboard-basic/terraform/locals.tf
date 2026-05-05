# -----------------------------------------------------------------------------
# LOCALS
# -----------------------------------------------------------------------------

locals {
  root_domain         = trimsuffix(var.root_domain, ".")
  dashboard_subdomain = trimsuffix(var.dashboard_subdomain, ".")
  dashboard_fqdn      = coalesce(var.dashboard_hostname, "${local.dashboard_subdomain}.${local.root_domain}")
}
