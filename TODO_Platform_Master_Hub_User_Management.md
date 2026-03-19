# Platform-Master-Hub User Management Implementation Plan

## Overview
This plan implements a hierarchical user management system where:
- **Platform-Master-Hub**: Has highest authority, can create invitations for any role, manage host assignments
- **Admin**: Can only manage hosts assigned to them
- **Support**: Has support role (to be defined)
- **Host**: Operates under their assigned admin

## Phase 1: Backend Database Changes

### 1.1 Update User Entity
**File**: `backend/src/entities/user.entity.ts`

Changes:
```typescript
export enum UserRole {
  CUSTOMER = 'customer',
  HOST = 'host',
  ADMIN = 'admin',
  SUPPORT = 'support',        // NEW
  PLATFORM_MASTER_HUB = 'platform_master_hub'  // NEW
}

// Add to User entity
@Index()
@Column({ nullable: true })
assignedAdminId: string;

@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'assignedAdminId' })
assignedAdmin: User;
```

### 1.2 Update HostInvitation Entity
**File**: `backend/src/entities/host-invitation.entity.ts`

Changes:
```typescript
// Add role field
@Column({ default: 'host' })
role: string;  // 'host', 'admin', 'support'

// Add isOneTime field
@Column({ default: true })
isOneTime: boolean;

// Track which admin this invitation was created for (for auto-assignment)
@Column({ nullable: true })
assignedAdminId: string;
```

## Phase 2: Backend API Changes

### 2.1 Update Invitation Controller
**File**: `backend/src/properties/host-invitation.controller.ts`

New Endpoints:
- `POST /api/invitations` - Create invitation (PLATFORM_MASTER_HUB only, for any role)
- `GET /api/invitations` - Get all invitations (PLATFORM_MASTER_HUB sees all, ADMIN sees own)
- `GET /api/invitations/stats` - Get invitation stats
- `DELETE /api/invitations/:id` - Cancel invitation

### 2.2 Create User Management Controller
**File**: `backend/src/users/user-management.controller.ts`

New Endpoints:
- `GET /api/users/admins` - Get all admins (PLATFORM_MASTER_HUB only)
- `GET /api/users/supports` - Get all support users (PLATFORM_MASTER_HUB only)
- `GET /api/users/hosts` - Get all hosts (PLATFORM_MASTER_HUB sees all, ADMIN sees assigned)
- `GET /api/users/hosts/unassigned` - Get unassigned hosts
- `POST /api/users/hosts/:hostId/assign` - Assign host to admin
- `POST /api/users/hosts/:hostId/reassign` - Reassign host to different admin

### 2.3 Update Invitation Service
**File**: `backend/src/properties/host-invitation.service.ts`

Changes:
- Add role parameter to createInvitation
- When admin creates host invitation, auto-assign to that admin
- Add getAllInvitations for PLATFORM_MASTER_HUB

### 2.4 Create User Management Service
**File**: `backend/src/users/user-management.service.ts`

New Service:
- getAllAdmins()
- getAllSupports()
- getAllHosts(adminId?) - returns all or assigned hosts
- getUnassignedHosts()
- assignHostToAdmin(hostId, adminId)
- reassignHost(hostId, newAdminId)

## Phase 3: Frontend Changes

### 3.1 Platform-Master-Hub Dashboard
**File**: `platform-master-hub-upgraded.html`

Add User Management Section:
1. **Invitation Panel**:
   - Dropdown to select role (Admin, Support, Host)
   - Email input
   - Generate link button
   - Display generated invitation link
   - List of recent invitations with status

2. **Host Assignment Panel**:
   - List of all hosts
   - Show which admin each host is assigned to
   - Dropdown to reassign host to different admin
   - Filter: Show unassigned hosts only

### 3.2 Admin Dashboard Updates
**File**: `admin-dashboard.html`

Add:
- Show only hosts assigned to this admin
- Create host invitation (auto-assigns to this admin)

## Implementation Steps

### Step 1: Update User Entity
- Add SUPPORT and PLATFORM_MASTER_HUB roles
- Add assignedAdminId field

### Step 2: Update HostInvitation Entity
- Add role field
- Add isOneTime field
- Add assignedAdminId field

### Step 3: Update Invitation Service
- Modify createInvitation to accept role parameter
- Auto-assign host to admin when admin creates invitation

### Step 4: Create User Management Service
- Create user-management.service.ts
- Implement host assignment logic

### Step 5: Create User Management Controller
- Create user-management.controller.ts
- Add authorization checks

### Step 6: Update Frontend
- Add User Management section to Platform-Master-Hub dashboard

## Authorization Rules

| Action | Platform-Master-Hub | Admin | Support | Host |
|--------|---------------------|-------|---------|------|
| Create Admin invitation | ✅ | ❌ | ❌ | ❌ |
| Create Support invitation | ✅ | ❌ | ❌ | ❌ |
| Create Host invitation | ✅ | ✅ (auto-assigns) | ❌ | ❌ |
| View all invitations | ✅ | Own only | Own only | ❌ |
| Assign host to admin | ✅ | ❌ | ❌ | ❌ |
| Reassign host | ✅ | ❌ | ❌ | ❌ |
| View all hosts | ✅ | Assigned only | ❌ | ❌ |

## Database Migration

After implementing entities, run migration:
```bash
npm run migration:generate -- src/migrations/AddUserRolesAndHostAssignment
npm run migration:run
```

## Testing Checklist

- [ ] Create invitation as Platform-Master-Hub for Admin role
- [ ] Create invitation as Platform-Master-Hub for Support role
- [ ] Create invitation as Admin for Host role (auto-assigns)
- [ ] View invitations (Platform-Master-HUB sees all, Admin sees own)
- [ ] Assign unassigned host to admin
- [ ] Reassign host from one admin to another
- [ ] Verify admin can only see their assigned hosts
- [ ] Test invitation validation and signup flow
