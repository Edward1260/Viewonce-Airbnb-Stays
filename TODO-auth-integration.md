# Auth Integration Plan

## Information Gathered:
1. **Backend API Base URL:** `http://localhost:3001/api/v1`
2. **Auth Endpoints:**
   - POST `/auth/signup` - Signup with email, password, firstName, lastName, phone (optional), role (optional)
   - POST `/auth/login` - Login with email, password
   - Response: `{ user, token, refreshToken }`
3. **User Roles:** ADMIN, HOST, CUSTOMER

## Current Issues in auth.html:
- Uses localStorage with demo data instead of actual API calls
- No error handling for API failures
- No loading states during authentication

## Plan:
- [ ] Update auth.html to connect to backend API
- [ ] Add proper error handling and loading states
- [ ] Store JWT token and user data from backend
- [ ] Redirect based on user role (admin → admin-dashboard.html, host → host-dashboard.html, customer → customer-dashboard.html)
- [ ] Test the integration

## Execution:
1. Update handleLogin() to call POST /auth/login
2. Update handleSignup() to call POST /auth/signup
3. Add proper error handling
4. Update the redirect logic to use actual user role
