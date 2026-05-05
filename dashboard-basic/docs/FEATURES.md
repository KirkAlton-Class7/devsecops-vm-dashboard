# Features

Basic VM Dashboard is a single-mode dashboard for VM smoke testing.

## Included

- Original DevSecOps-style card, header, sidebar, and widget presentation
- CPU, memory, disk, and estimated cost cards
- Instance identity
- Network details
- Region, zone, and hostname
- Local system resources
- Nginx/API/static build service status
- Local health endpoints
- Featured quote card
- Screensaver card
- Scenes from Around the World gallery card
- Widget snapshot copy controls with Manual Copy fallback
- Text Mode with refresh, snapshot copy, JSON copy, help, and dashboard exit controls
- Mock fallback data for local development

## Text Mode

Text Mode uses the same terminal-style visual system as the advanced dashboard while keeping the Basic permission surface small. It uses a full-screen cyan grid background, blocked information panels, copy controls, mock-data warning state, service sorting/filtering, and an all-services modal.

[PICTURE: Screenshot of Basic VM Dashboard Text Mode showing the cyan grid background, blocked Identity and Overview panels, and top copy controls]

Use `T` to open Text Mode. Use `B` or `Esc` to return to the visual Basic dashboard.

[PICTURE: Screenshot of Basic VM Dashboard Text Mode help overlay showing B, C, J, H, S, FS, and SS keyboard shortcuts]

Service workflows match the terminal behavior of the advanced dashboard, minus logs and other protected integrations.

[PICTURE: Screenshot of Basic VM Dashboard Text Mode service filter modal with cyan terminal styling]

## Excluded by Design

- FinOps mode
- Logs widget and logs API
- Load trend widget
- Cloud Monitoring metrics
- BigQuery billing export
- Recommender and rightsizing data
- Secret Manager-backed Basic Auth

This keeps the deployment small and suitable for basic VM testing.
