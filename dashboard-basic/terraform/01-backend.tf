# ----------------------------------------------------------------
# Terraform Backend Configuration (GCS)
# ----------------------------------------------------------------
# The backend bucket must already exist before `terraform init`.
# Comment this block if you want to use local Terraform state for a lab.

terraform {
  backend "gcs" {
    bucket = "kirkdevsecops-terraform-state"
    prefix = "dashboard-basic/dev"
  }
}
