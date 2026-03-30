# Platform Master Hub Implementation TODO

## Status: [ ] In Progress

## Plan Summary
Create private `/platform-master-hub` dashboard with `/platform-master/login`, Supabase 'platform_master' role protection.

## Steps:

### 1. Backend - Role Verification Endpoint [x]
- [x] `backend/src/auth/auth.service.ts`: Added `verifyPlatformMaster()`
- [x] `backend/src/auth/auth.controller.ts`: Added `GET /auth/verify-platform-master`
- [ ] Test endpoint

### 2. Frontend - New Login Page [ ]
- [ ] Create `platform-master-login.html`
- [ ] Supabase login + role check + redirect

### 3. Frontend - Router Updates [ ]
- [ ] `router.js`: Add `/platform-master-hub` (protected), `/platform-master/login`
- [ ] Update `roleDashboardMap`: `'platform_master': 'platform-master-hub-fixed.html'`

### 4. Frontend - Dashboard Updates [ ]
- [ ] `platform-master-hub-fixed.html`: Fix auth check to `'platform_master'`
- [ ] Add backend role verification

### 5. Auth Utils [ ]
- [ ] Update `checkAuth()` to use API verification
- [ ] `lib/auth-utils.js` / `api.js` updates if needed

### 6. Testing [ ]
- [ ] Test login flow
- [ ] Test direct URL protection
- [ ] Browser verification
- [ ] Vercel deploy test

### 7. Production [ ]
- [ ] Update vercel.json if needed
- [ ] Deploy & verify

**Next Step:** Backend endpoint creation
