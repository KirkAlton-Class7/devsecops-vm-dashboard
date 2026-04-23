# -----------------------------------------------------------------------------
# LOCALS
# -----------------------------------------------------------------------------

locals {
# -----------------------------------------------------------------------------
# LABELS
# -----------------------------------------------------------------------------
  
  # Core Labels (applied to every resource)
  core_labels = {
    environment = "dev"                 # dev, staging, prod
    managed_by  = "terraform"           # automation tool
    owner       = "platform-team"       # team responsible
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