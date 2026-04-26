# ----------------------------------------------------------------
# SERVICE ACCOUNTS
# ----------------------------------------------------------------

# ----------------------------------------------------------------
# SERVICE ACCOUNT - VM DASHBOARD
# ----------------------------------------------------------------
resource "google_service_account" "vm_dashboard" {
  project      = "kirk-devsecops-sandbox" # Replace with your project
  account_id   = "vm-dashboard"
  display_name = "VM Dashboard Service Account"
}