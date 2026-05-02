# ----------------------------------------------------------------
# VARIABLES
# ----------------------------------------------------------------
variable "billing_account_id" {
  description = "The Google Cloud Billing Account ID used by the VM dashboard."
  default     = "01BB2F-8195CD-645BC0"
  type        = string
}

variable "dashboard_hostname" {
  description = "Optional fully qualified DNS name for the VM dashboard HTTPS endpoint. If null, Terraform uses dashboard_subdomain.root_domain."
  default     = null
  type        = string
  nullable    = true
}

variable "dashboard_subdomain" {
  description = "Subdomain to use under root_domain for the VM dashboard."
  default     = "dashboard"
  type        = string
}

variable "letsencrypt_email" {
  description = "Email address used for Let's Encrypt registration and renewal notices."
  default     = "kirkdevsecops@icloud.com"
  type        = string
}

variable "dashboard_dev_auth_user_secret_id" {
  description = "Secret Manager secret ID or resource path containing the DevSecOps Basic Auth username."
  default     = "vm-dashboard-dev-username"
  type        = string
}

variable "dashboard_dev_auth_password_secret_id" {
  description = "Secret Manager secret ID or resource path containing the DevSecOps Basic Auth password. The secret value is fetched by the VM at bootstrap time and is not stored in Terraform state."
  default     = "vm-dashboard-dev-password"
  type        = string
}

variable "dashboard_finops_auth_user_secret_id" {
  description = "Secret Manager secret ID or resource path containing the FinOps Basic Auth username."
  default     = "vm-dashboard-finops-username"
  type        = string
}

variable "dashboard_finops_auth_password_secret_id" {
  description = "Secret Manager secret ID or resource path containing the FinOps Basic Auth password. The secret value is fetched by the VM at bootstrap time and is not stored in Terraform state."
  default     = "vm-dashboard-finops-password"
  type        = string
}

variable "dashboard_auth_user_secret_id" {
  description = "Deprecated legacy Secret Manager secret ID for the old single dashboard username. Prefer dashboard_dev_auth_user_secret_id."
  default     = null
  type        = string
  nullable    = true
}

variable "dashboard_auth_password_secret_id" {
  description = "Deprecated legacy Secret Manager secret ID for the old single dashboard password. Prefer dashboard_dev_auth_password_secret_id."
  default     = null
  type        = string
  nullable    = true
}

variable "create_route53_record" {
  description = "Whether Terraform should create the Route 53 A record for the dashboard hostname."
  default     = true
  type        = bool
}

variable "manage_route53_in_terraform" {
  description = "If true, create/manage the Route 53 hosted zone in Terraform. Leave false when the hosted zone already exists."
  default     = false
  type        = bool
}

variable "route53_private_zone" {
  description = "If true, use a private Route 53 hosted zone. Public dashboards should keep this false."
  default     = false
  type        = bool
}

variable "root_domain" {
  description = "Root DNS name without a subdomain."
  default     = "kirkdevsecops.com"
  type        = string
}

variable "aws_region" {
  description = "AWS region used to configure the Route 53 provider."
  default     = "us-east-1"
  type        = string
}

variable "aws_profile" {
  description = "Optional local AWS profile name for Route 53 changes. Leave null to use default AWS credentials."
  default     = null
  type        = string
}
