# ----------------------------------------------------------------
# OUTPUTS
# ----------------------------------------------------------------

output "vm_name" {
  description = "Name of the VM"
  value       = google_compute_instance.vm_dashboard.name
}

output "vm_external_ip" {
  description = "External IP address of the VM"
  value       = google_compute_address.vm_dashboard.address
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "gcloud compute ssh ${google_compute_instance.vm_dashboard.name} --zone us-central1-a"
}

output "vm_internal_ip" {
  description = "Internal IP address of the VM"
  value       = google_compute_instance.vm_dashboard.network_interface[0].network_ip
}

output "dashboard_hostname" {
  description = "DNS hostname configured for the VM dashboard."
  value       = local.dashboard_fqdn
}

output "dashboard_url" {
  description = "HTTPS URL for the VM dashboard."
  value       = "https://${local.dashboard_fqdn}"
}

output "route53_record_fqdn" {
  description = "Route 53 record created for the VM dashboard, when enabled."
  value       = var.create_route53_record ? aws_route53_record.vm_dashboard[0].fqdn : null
}
