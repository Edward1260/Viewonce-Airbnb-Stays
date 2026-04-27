# ViewOnce Airbnb Stays - Debug & Deploy Progress

## Status: ✅ Plan Approved - Pure Static SPA for Vercel Frontend

## 1. Frontend (Vercel Static SPA) [0/5]
- [ ] Fix vercel.json: Serve welcome.html at /, SPA index.html catch-all, API proxy if needed
- [ ] Fix index.html: Create proper SPA shell with router.js loading
- [ ] Verify script.js/api.js: handleLogin() sets localStorage userRole from backend response
- [ ] Local test: `npx serve .` - welcome → login → dashboard flow
- [ ] Vercel preview deploy & test

## 2. Backend Integration (Supabase) [0/3]  
- [ ] Verify backend/src/main.ts runs, API endpoints respond
- [ ] Test auth flow: login → returns user with role → sets userRole
- [ ] CORS: Allow Vercel domain

## 3. End-to-End [0/2]
- [ ] Full user flow: welcome → signup/login → correct dashboard
- [ ] Production Vercel deploy

**Next Step:** Fix vercel.json

**Backend Note:** User confirmed runs well in Supabase
