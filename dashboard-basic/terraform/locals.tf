# -----------------------------------------------------------------------------
# LOCALS
# -----------------------------------------------------------------------------

locals {
  env                 = lower(var.env)
  app                 = var.app
  name_prefix         = "${local.app}-${local.env}"
  root_domain         = trimsuffix(var.root_domain, ".")
  dashboard_subdomain = trimsuffix(var.dashboard_subdomain, ".")
  dashboard_fqdn      = coalesce(var.dashboard_hostname, "${local.dashboard_subdomain}.${local.root_domain}")
}
