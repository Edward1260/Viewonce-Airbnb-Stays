# Authentication & PWA Implementation Plan

## Phase 1: Authentication System Updates
- [ ] 1.1 Update auth.html to call actual API for login/signup
- [ ] 1.2 Add role-based redirect logic
- [ ] 1.3 Handle invitation link parameters (?role=xxx&token=xxx)
- [ ] 1.4 Update router.js with correct dashboard paths
- [ ] 1.5 Add support role redirect to support-dashboard-upgraded.html

## Phase 2: Invitation System
- [x] 2.1 Create host-signup.html (for invited hosts)
- [x] 2.2 Create admin-signup.html (for invited admins)
- [x] 2.3 Create support-signup.html (for invited support)

## Phase 3: PWA Configuration
- [x] 3.1 Update manifest.json with 512x512 icon
- [x] 3.2 Add custom app icon configuration

## Phase 4: Platform Master Hub Integration
- [ ] 4.1 Add user invitation management section
- [ ] 4.2 Generate role-specific invitation links
- [ ] 4.3 Display invitation links for hosts, admins, support

## Dashboard Redirect Mapping (Confirmed)
- customer → customer-dashboard.html
- host → host-dashboard-upgraded.html
- admin → admin-dashboard.html
- support → support-dashboard-upgraded.html
