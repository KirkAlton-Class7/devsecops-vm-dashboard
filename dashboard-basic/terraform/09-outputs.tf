# ----------------------------------------------------------------
# OUTPUTS
# ----------------------------------------------------------------

output "vm_name" {
  description = "Name of the VM."
  value       = google_compute_instance.vm_dashboard.name
}

output "vm_external_ip" {
  description = "External IP address of the VM."
  value       = google_compute_address.vm_dashboard.address
}

output "vm_internal_ip" {
  description = "Internal IP address of the VM."
  value       = google_compute_instance.vm_dashboard.network_interface[0].network_ip
}

output "ssh_command" {
  description = "SSH command to connect to the VM."
  value       = "gcloud compute ssh ${google_compute_instance.vm_dashboard.name} --zone ${var.gcp_zone}"
}

output "dashboard_http_url" {
  description = "HTTP URL for the Basic VM Dashboard."
  value       = "http://${google_compute_address.vm_dashboard.address}"
}

output "dashboard_hostname" {
  description = "DNS hostname configured for the dashboard."
  value       = local.dashboard_fqdn
}

output "dashboard_https_url" {
  description = "HTTPS URL for the Basic VM Dashboard, when DNS and Certbot are configured."
  value       = "https://${local.dashboard_fqdn}"
}
