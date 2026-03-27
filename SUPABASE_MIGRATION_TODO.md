# Supabase Migration TODO - Phase 2 & Dashboard Fixes

## Phase 2: api.js Rewrite [IN PROGRESS]
- [x] 2.1.1 Provide Supabase URL and anon key
- [x] 2.1.2 Enable lib/supabase.js with real config
- [ ] 2.1.3 Rewrite auth endpoints (login/signup/profile → supabase.auth)
- [ ] 2.1.4 Rewrite properties CRUD (getProperties/createProperty → supabase.from('buildings'))
- [ ] 2.1.5 Rewrite bookings (getBookings/createBooking)
- [ ] 2.1.6 Rewrite uploads (supabase.storage)
- [ ] 2.1.7 Stub remaining (payments/AI/host-invitations)
- [ ] 2.2 Update IMPLEMENTATION_PLAN.md checkboxes
- [ ] 2.3 User: Run SUPABASE_SCHEMA.sql

## Dashboard Fixes [PARALLEL]
- [ ] support-dashboard-upgraded.html: API integration, auth, error handling, AI chat
- [ ] platform-master-hub-fixed.html: AI toggle, theme toggle, responsive modal
- [ ] ai-luxury-dashboard.js / ai-section-html: Sidebar dropdowns, luxury styling

## Next Phases
- [ ] Phase 3: Confirm DB tables/RLS
- [ ] Phase 4: rm -rf backend/
- [ ] Phase 6: Test core flows
- [ ] Phase 7: vercel --prod

**Current Step:** Provide Supabase project URL and anon key to proceed with api.js rewrite.
