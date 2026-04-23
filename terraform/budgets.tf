# ----------------------------------------------------------------
# BILLING BUDGETS
# ----------------------------------------------------------------
# Budgets rely on labels:
# "component" is for broad grouping
# "app_component" is for a specific service
#
# IMPORTANT:
# Resources must have matching labels for budget to create data
# ----------------------------------------------------------------

# ----------------------------------------------------------------
# DAILY BUDGET
# ----------------------------------------------------------------
# Tracks ALL project spending
# No label required
# ----------------------------------------------------------------

resource "google_billing_budget" "daily_budget" {
  billing_account = "01BB2F-8195CD-645BC0" # Replace with your billing account ID
  display_name    = "Daily Budget (Simulated)"

  lifecycle {
    prevent_destroy = true
  }

  budget_filter {
    projects = ["projects/kirk-devsecops-sandbox"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "150" # Monthly units (about $5 a day)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.9
  }
}

# ----------------------------------------------------------------
# COMPUTE BUDGET
# ----------------------------------------------------------------
# Tracks compute resources
# Requires label: component = compute
# ----------------------------------------------------------------

resource "google_billing_budget" "compute_budget" {
  billing_account = "01BB2F-8195CD-645BC0" # Replace with your billing account ID
  display_name    = "Compute Budget"

  lifecycle {
    prevent_destroy = true
  }

  budget_filter {
    projects = ["projects/kirk-devsecops-sandbox"]

    labels = {
      component = "compute"
    }
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "25"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.75
  }

  threshold_rules {
    threshold_percent = 0.9
  }
}

# ----------------------------------------------------------------
# BIGQUERY BUDGET
# ----------------------------------------------------------------
# Tracks BigQuery usage
# Requires label: app_component = bigquery
# ----------------------------------------------------------------

resource "google_billing_budget" "bigquery_budget" {
  billing_account = "01BB2F-8195CD-645BC0" # Replace with your billing account ID
  display_name    = "BigQuery Budget"

  lifecycle {
    prevent_destroy = true
  }

  budget_filter {
    projects = ["projects/kirk-devsecops-sandbox"]

    labels = {
      app_component = "bigquery"
    }
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.9
  }
}

# ----------------------------------------------------------------
# NETWORK BUDGET
# ----------------------------------------------------------------
# Tracks networking resources
# Requires label: component = network
# ----------------------------------------------------------------

resource "google_billing_budget" "network_budget" {
  billing_account = "01BB2F-8195CD-645BC0" # Replace with your billing account ID
  display_name    = "Network Budget"

  lifecycle {
    prevent_destroy = true
  }

  budget_filter {
    projects = ["projects/kirk-devsecops-sandbox"]

    labels = {
      component = "network"
    }
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "15"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.9
  }
}