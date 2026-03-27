# Supabase Migration Implementation Plan & Progress

**Status:** Active - Phase 2 api.js rewrite

## Detailed Steps Checklist

### Phase 2: Core API Layer [IN PROGRESS]
- [ ] 2.1 Rewrite api.js MVP (auth/profiles/listings/bookings/uploads → Supabase; stub rest)
- [ ] 2.2 Update TODO_PROGRESS.md checkboxes
- [ ] 2.3 User: Run SUPABASE_SCHEMA.sql in dashboard

### Phase 3: Database Schema [PENDING]
- [ ] User confirms tables/RLS/RPC created

### Phase 4: Remove Backend [PENDING]
- [ ] rm -rf backend/
- [ ] rm render.yaml server.js
- [ ] Clean root package.json (remove @nestjs/* etc.)

### Phase 5: Frontend Updates [PENDING]
- [ ] search_files for remaining window.api direct calls (if any)

### Phase 6: Testing [PENDING]
- [ ] npm run dev
- [ ] Test core flows

### Phase 7: Deploy [PENDING]
- [ ] Vercel deploy

**Next Step:** Complete 2.1 api.js rewrite
