# ----------------------------------------------------------------
# VARIABLES
# ----------------------------------------------------------------

variable "project_id" {
  description = "Google Cloud project ID where the Basic VM Dashboard is deployed."
  type        = string
}

variable "gcp_region" {
  description = "Google Cloud region for the VM and static IP."
  default     = "us-central1"
  type        = string
}

variable "gcp_zone" {
  description = "Google Cloud zone for the VM."
  default     = "us-central1-a"
  type        = string
}

variable "machine_type" {
  description = "VM machine type."
  default     = "e2-medium"
  type        = string
}

variable "dashboard_hostname" {
  description = "Optional fully qualified DNS name for the dashboard HTTPS endpoint. If null, Terraform uses dashboard_subdomain.root_domain."
  default     = null
  type        = string
  nullable    = true
}

variable "dashboard_subdomain" {
  description = "Subdomain to use under root_domain for the dashboard."
  default     = "basic-dashboard"
  type        = string
}

variable "letsencrypt_email" {
  description = "Email address used for Let's Encrypt registration and renewal notices."
  default     = ""
  type        = string
}

variable "letsencrypt_staging_enabled" {
  description = "If true, Certbot uses the Let's Encrypt staging environment. Useful for labs because it avoids production certificate rate limits, but the resulting certificate is not browser-trusted."
  default     = false
  type        = bool
}

variable "root_domain" {
  description = "Root DNS name without a subdomain."
  default     = "example.com"
  type        = string
}
