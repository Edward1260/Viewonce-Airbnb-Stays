# Platform Master Hub - Complete Setup & Deployment Guide

## Overview

This document provides comprehensive instructions for setting up and deploying the Platform Master Hub system, including the Super Admin one-time setup, email verification, optional 2FA, and PWA installation.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backend Setup](#backend-setup)
3. [One-Time Super Admin Setup](#one-time-super-admin-setup)
4. [Email Verification](#email-verification)
5. [Optional Two-Factor Authentication (2FA)](#optional-two-factor-authentication-2fa)
6. [Frontend Deployment](#frontend-deployment)
7. [PWA Installation](#pwa-installation)
8. [Desktop & Mobile Installation](#desktop--mobile-installation)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [Troubleshooting](#troubleshooting)

---

## System Architecture

### User Roles

| Role | Description | Access |
|------|-------------|--------|
| `super_admin` | Platform Master Hub Super Admin | `/platform-master-hub/*` |
| `admin` | Platform Administrator | `/admin-dashboard.html` |
| `host` | Property Host | `/host-dashboard-upgraded.html` |
| `support` | Support Team | `/support-dashboard.html` |
| `customer` | Regular User | `/login`, `/invite-signup` |

### URLs

- **Super Admin Setup:** `http://localhost:3001/platform-master-hub/setup.html`
- **Super Admin Login:** `http://localhost:3001/platform-master-hub/login.html`
- **Super Admin Dashboard:** `http://localhost:3001/platform-master-hub/dashboard.html`
- **Regular Login:** `http://localhost:3001/login.html`
- **Invite Signup:** `http://localhost:3001/invite-signup.html`

---

## Backend Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation Steps

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Build the project
npm run build

# Start the production server
npm run start:prod
```

The backend will run on `http://localhost:3001`

---

## One-Time Super Admin Setup

### Important Notes

- ⚠️ The setup page `/platform-master-hub/setup.html` works **ONLY ONCE**
- After creating the super admin account, the setup endpoint is disabled
- Future access requires login at `/platform-master-hub/login.html`

### Setup Process

1. **Access the Setup Page**

   Navigate to: `http://localhost:3001/platform-master-hub/setup.html`

2. **Fill in the Form**

   | Field | Required | Description |
   |-------|----------|-------------|
   | First Name | Yes | Your first name |
   | Last Name | Yes | Your last name |
   | Email | Yes | Your email address |
   | Phone | No | Phone number |
   | Password | Yes | Min 8 characters |
   | Confirm Password | Yes | Must match password |

3. **Password Requirements**

   - Minimum 8 characters
   - Use uppercase and lowercase letters
   - Include numbers
   - Include special symbols (!@#$%^&*)

4. **Submit the Form**

   Click "Create Super Admin Account" button

5. **Automatic Redirect**

   After successful setup, you'll be automatically redirected to the dashboard

### API Endpoint

```
POST /api/v1/auth/setup
Content-Type: application/json

{
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@example.com",
  "phone": "+1234567890",
  "password": "SecurePassword123!"
}
```

### Check Setup Status

```
GET /api/v1/auth/setup-status

Response (Setup Required):
{
  "required": true,
  "message": "No super admin. Setup required."
}

Response (Setup Complete):
{
  "required": false,
  "message": "Setup complete. Login instead."
}
```

---

## Email Verification

### Overview

After creating the super admin account, email verification is required. Users must verify their email before accessing certain features.

### Sending Verification Email

```
POST /api/v1/auth/verify-email/send
Authorization: Bearer <token>

Response:
{
  "message": "Verification email sent. Please check your inbox."
}
```

### Verifying Email

```
POST /api/v1/auth/verify-email/:token

Response:
{
  "message": "Email verified successfully",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "isEmailVerified": true
  }
}
```

---

## Optional Two-Factor Authentication (2FA)

### Overview

2FA is optional and can be enabled by users for additional security. It uses Time-based One-Time Passwords (TOTP) compatible with authenticator apps like Google Authenticator, Authy, etc.

### Enable 2FA

1. **Generate Secret**

   ```
   POST /api/v1/auth/2fa/enable
   Authorization: Bearer <token>

   Response:
   {
     "secret": "JBSWY3DPEHPK3PXP",
     "qrCode": "otpauth://totp/user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ViewOnce"
   }
   ```

2. **Scan QR Code**

   Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)

3. **Verify and Activate**

   ```
   POST /api/v1/auth/2fa/verify
   Authorization: Bearer <token>
   Content-Type: application/json

   {
     "code": "123456"
   }

   Response:
   {
     "message": "2FA enabled successfully"
   }
   ```

### Login with 2FA

If 2FA is enabled, the login process requires an additional step:

```
POST /api/v1/auth/login/2fa
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "code": "123456"
}

Response:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

### Disable 2FA

```
POST /api/v1/auth/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}

Response:
{
  "message": "2FA disabled successfully"
}
```

### Check 2FA Status

```
GET /api/v1/auth/2fa/status
Authorization: Bearer <token>

Response:
{
  "enabled": true
}
```

---

## Frontend Deployment

### Development Mode

```bash
# Start development server
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# The build output will be in the dist/ folder
```

### Static File Server

You can serve the frontend using any static file server:

```bash
# Using Python
python -m http.server 3001

# Using Node.js
npx serve -p 3001
```

---

## PWA Installation

### What is a PWA?

Progressive Web Apps (PWA) are web applications that can be installed on your device and work offline.

### Browser Support

- Chrome/Edge (Desktop & Mobile)
- Firefox (Desktop & Mobile)
- Safari (iOS & macOS)
- Samsung Internet

### Installing PWA

#### Desktop (Chrome/Edge)

1. Open the website in Chrome/Edge
2. Look for the install icon in the address bar (or menu → Install)
3. Click "Install"

#### Mobile (Android)

1. Open the website in Chrome
2. Tap the menu button (three dots)
3. Tap "Add to Home Screen" or "Install App"

#### iOS (Safari)

1. Open the website in Safari
2. Tap the share button
3. Tap "Add to Home Screen"

### PWA Features

Once installed, the PWA provides:

- ✅ App-like experience
- ✅ Offline support
- ✅ Home screen icon
- ✅ Standalone window
- ✅ Push notifications (if enabled)

### PWA Shortcuts

The manifest includes shortcuts for quick access:

| Shortcut | URL | Description |
|----------|-----|-------------|
| Platform Setup | `/platform-master-hub/setup.html` | Initial setup (Super Admin) |
| Platform Login | `/platform-master-hub/login.html` | Login page |
| Platform Dashboard | `/platform-master-hub/dashboard.html` | Main dashboard |
| Host Dashboard | `/host-dashboard-upgraded.html` | Host management |
| Admin Dashboard | `/admin-dashboard.html` | Admin panel |
| Support Dashboard | `/support-dashboard.html` | Support panel |

---

## Desktop & Mobile Installation

### Desktop Installation Methods

#### 1. PWA Installation (Recommended)

Install as a PWA for the best experience with offline support.

#### 2. Browser Shortcut

**Chrome:**
1. Open the website
2. Menu → More Tools → Create Shortcut
3. Check "Open as window"
4. Click Create

**Firefox:**
1. Open the website
2. Menu → More Tools → Website Shortcut
3. Check "Open in a new window"
4. Click Create

### Mobile Installation Methods

#### 1. PWA Installation (Recommended)

- **Android:** Chrome → Menu → Add to Home Screen
- **iOS:** Safari → Share → Add to Home Screen

#### 2. Mobile Browser Bookmark

Save as a bookmark for quick access from your mobile browser

---

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/auth/setup-status` | Check if setup required | No |
| POST | `/api/v1/auth/setup` | Create super admin | No |
| POST | `/api/v1/auth/login` | User login | No |
| POST | `/api/v1/auth/signup` | User registration | No |
| POST | `/api/v1/auth/refresh` | Refresh token | No |
| POST | `/api/v1/auth/logout` | User logout | Yes |
| GET | `/api/v1/auth/profile` | Get user profile | Yes |

### Email Verification Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/verify-email/send` | Send verification email | Yes |
| POST | `/api/v1/auth/verify-email/:token` | Verify email | No |

### 2FA Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/auth/2fa/status` | Get 2FA status | Yes |
| POST | `/api/v1/auth/2fa/enable` | Enable 2FA | Yes |
| POST | `/api/v1/auth/2fa/verify` | Verify & activate 2FA | Yes |
| POST | `/api/v1/auth/2fa/disable` | Disable 2FA | Yes |
| POST | `/api/v1/auth/login/2fa` | Login with 2FA code | No |

---

## Troubleshooting

### Common Issues

#### 1. Setup Already Complete

**Error:** "Super admin already exists. Setup is complete."

**Solution:** Use the login page instead: `/platform-master-hub/login.html`

#### 2. Invalid Credentials

**Error:** "Invalid credentials"

**Solution:** 
- Check your email and password
- Ensure email is lowercase
- Reset password if necessary

#### 3. Token Expiration

**Error:** "Invalid or expired token"

**Solution:** Use the refresh token endpoint to get a new token

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### 4. 2FA Code Issues

**Error:** "Invalid verification code"

**Solution:**
- Ensure you're using the current code from your authenticator app
- Codes refresh every 30 seconds
- Check that your device time is synchronized

#### 5. PWA Installation Failed

**Solution:**
- Ensure you're using a supported browser
- HTTPS is required for PWA installation (except localhost)
- Clear browser cache and try again

### Getting Help

If you encounter any issues:

1. Check the browser console for error messages
2. Verify the backend is running and accessible
3. Check network requests for failed API calls
4. Review the server logs for backend errors

---

## Security Best Practices

1. ✅ Use strong, unique passwords
2. ✅ Enable 2FA for additional security
3. ✅ Verify your email address
4. ✅ Keep your credentials confidential
5. ✅ Log out after using shared devices
6. ✅ Use HTTPS in production
7. ✅ Regularly update your password

---

## Production Deployment Checklist

- [ ] Backend server running with HTTPS
- [ ] Frontend deployed and accessible
- [ ] Database configured and migrated
- [ ] Environment variables set
- [ ] SSL/TLS certificates installed
- [ ] PWA manifest configured
- [ ] Service worker registered
- [ ] Super admin account created
- [ ] Email verification configured
- [ ] 2FA available for users

---

## Version Information

- Platform Master Hub: 1.0.0
- API Version: v1
- Last Updated: 2024

---

**© 2024 ViewOnce Airbnb Stays. All rights reserved.**
