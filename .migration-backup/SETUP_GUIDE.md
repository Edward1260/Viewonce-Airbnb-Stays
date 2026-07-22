# Platform Master Hub - Setup Guide

## One-Time Signup Link
**http://localhost:3001/platform-master-hub/setup.html**

---

## Step 1: Add Methods to auth.service.fixed.ts

Open file: `backend/src/auth/auth.service.fixed.ts`

Add these methods at the END of the AuthService class (before the last closing brace):

```typescript
  async checkSuperAdminExists(): Promise<boolean> {
    const superAdmin = await this.userRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });
    return !!superAdmin;
  }

  async createSuperAdmin(signupDto: SignupDto): Promise<{ user: User; token: string; refreshToken: string }> {
    const existingSuperAdmin = await this.userRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (existingSuperAdmin) {
      throw new ConflictException('Super admin already exists. Setup is complete.');
    }

    const { email, password, firstName, lastName, phone } = signupDto;

    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestException('Email, password, firstName, and lastName are required');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const normalizedPhone = phone?.replace(/[\s\-\(\)]/g, '') || '';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
    });

    await this.userRepository.save(user);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: 604800 });

    return { user, token, refreshToken };
  }

  async isSetupRequired(): Promise<{ required: boolean; message: string }> {
    const superAdminExists = await this.checkSuperAdminExists();
    return superAdminExists
      ? { required: false, message: 'Setup already complete. Please login as super admin.' }
      : { required: true, message: 'No super admin found. Setup is required.' };
  }
```

---

## Step 2: Add Endpoints to auth.controller.ts

Open file: `backend/src/auth/auth.controller.ts`

Add these endpoints at the END of the AuthController class (before the last closing brace):

```typescript
  @Get('setup-status')
  async getSetupStatus() {
    return this.authService.isSetupRequired();
  }

  @Post('setup')
  async setup(@Body() body: any) {
    return this.authService.createSuperAdmin(body);
  }
```

---

## Step 3: Rebuild and Restart

Open a terminal in the backend folder and run:

```bash
cd backend
npm run build
npm run start:prod
```

---

## Step 4: Access the Setup Page

Open your browser and go to:
**http://localhost:3001/platform-master-hub/setup.html**

Fill in the form to create your super admin account!

---

## Notes

- The setup link only works ONCE - after creating a super admin, it cannot be used again
- After setup, login at: http://localhost:3001/platform-master-hub/login.html
- Dashboard: http://localhost:3001/platform-master-hub/dashboard.html
