# ----------------------------------------------------------------
# Terraform Configuration
# ----------------------------------------------------------------
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.33"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.46"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.9.0"
    }
  }
}

provider "google" {
  project = "kirk-devsecops-sandbox"
  region  = "us-central1"
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

# resource "null_resource" "check_ansible" {
#   triggers = {
#     always_run = timestamp()
#   }

#   provisioner "local-exec" {
#     command = "ansible --version"
#   }
# }
