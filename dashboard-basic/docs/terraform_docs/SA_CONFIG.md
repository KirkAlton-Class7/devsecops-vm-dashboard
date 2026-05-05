# Service Account Notes

Basic VM Dashboard does not create or require a custom VM service account.

The dashboard reads:

- Local Linux system files
- The GCE metadata server
- Local service status

It does not require project-level dashboard IAM roles such as BigQuery, Monitoring, Recommender, Billing, Secret Manager, or Logging roles.

> [!NOTE]
> Your Terraform operator identity still needs enough permissions to create Compute Engine resources, firewall rules, and optional DNS records. That is separate from the VM runtime identity.
