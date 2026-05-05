# -----------------------------------------------------------------------------
# LOCALS
# -----------------------------------------------------------------------------

locals {

  project_name = "DevSecOps Sandbox" # Replace with your project name or ID

  # Route 53 DNS naming, adapted from old-tf.
  root_domain         = trimsuffix(var.root_domain, ".")
  dashboard_subdomain = trimsuffix(var.dashboard_subdomain, ".")
  dashboard_fqdn      = coalesce(var.dashboard_hostname, "${local.dashboard_subdomain}.${local.root_domain}")
  route53_zone_name   = "${local.root_domain}."
  route53_zone_id     = coalesce(try(aws_route53_zone.vm_dashboard[0].zone_id, null), try(data.aws_route53_zone.vm_dashboard[0].zone_id, null))

  # Secret Manager accepts short secret IDs for IAM bindings.
  # These locals also tolerate full resource paths such as projects/<project>/secrets/<secret>.
  dashboard_auth_secret_ids = toset([
    regex("[^/]+$", var.dashboard_dev_auth_user_secret_id),
    regex("[^/]+$", var.dashboard_dev_auth_password_secret_id),
    regex("[^/]+$", var.dashboard_finops_auth_user_secret_id),
    regex("[^/]+$", var.dashboard_finops_auth_password_secret_id)
  ])

  # -----------------------------------------------------------------------------
  # LABELS
  # -----------------------------------------------------------------------------

  # Core Labels (applied to every resource)
  core_labels = {
    environment = "dev"           # dev, staging, prod
    managed_by  = "terraform"     # automation tool
    owner       = "platform-team" # team responsible
  }

  # Resource Labels

  network_labels = {
    component = "network"
  }

  compute_labels = {
    component = "compute"
  }

  asg_labels = {
    component     = "compute"
    app_component = "autoscaling"
  }

  load_balancer_labels = {
    component     = "network"
    app_component = "load-balancing"
  }

  kubernetes_labels = {
    component     = "compute"
    app_component = "kubernetes"
  }

  iam_labels = {
    component = "iam"
  }

  logging_labels = {
    component     = "observability"
    app_component = "logging"
  }

  serverless_labels = {
    component     = "compute"
    app_component = "serverless"
  }

  api_labels = {
    component     = "application"
    app_component = "api"
  }

  bigquery_labels = {
    component     = "data"
    app_component = "bigquery"
  }

  budget_labels = {
    component = "finops"
  }
}
