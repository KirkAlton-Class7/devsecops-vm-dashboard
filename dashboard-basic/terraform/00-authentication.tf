# ----------------------------------------------------------------
# Terraform Configuration
# ----------------------------------------------------------------

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "kirk-devsecops-sandbox"
  region  = "us-central1"
}
