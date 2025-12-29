# Phase 3 - Licensing + Release Prep (One-Time License)

Goal: Add one-time licensing for MCP/API features while keeping manual tasking free, and prepare the app for a public release.

## Outcomes
- One-time license checkout and key issuance (MoR provider).
- License activation with 2-device limit.
- MCP/API features gated behind a valid license.
- Clear upgrade path and basic release assets.

## Deliverables
- Licensing integration (provider SDK/API).
- License validation + activation flow.
- UI for license entry and status.
- Gated MCP/API routes.
- Packaging/signing pipeline for Windows/macOS.
- Release page assets (copy, screenshots, demo).

## Task Breakdown
1) Provider setup (Lemon Squeezy or similar)
   - Create product + price
   - Enable license keys + activation limits (2 devices)
   - Configure webhooks (optional)

2) Local license validation
   - Add `server/license.js` to validate key via provider API
   - Cache activation token locally
   - Handle deactivate / re-activate flow

3) UI integration
   - Add License panel in Settings
   - Show license status + activations used
   - Add “Deactivate this device” option

4) Feature gating
   - Require valid license for:
     - MCP server start
     - Local API endpoints used by MCP
   - Manual UI flows remain free

5) Release packaging
   - Electron build + installer for Windows/macOS
   - Add versioning strategy
   - Create release notes template

6) Launch assets
   - Landing page copy (done)
   - Demo video/GIF
   - Screenshots (Outline, Kanban, Gantt, Mind Map)

## Key Decisions
- One-time license, no subscription.
- MCP/API as paid boundary.
- 2-device activation limit.

## Acceptance Criteria
- User can purchase, receive key, activate on 2 devices.
- MCP/API disabled without valid license.
- Manual UI works without license.
- Installers build cleanly on both platforms.

## Risks / Notes
- License abuse if offline caching is too permissive.
- Activation service outages should fail gracefully.
- Keep all licensing checks local and fast to avoid UI lag.

