import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserRole } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'role', 'status', 'createdAt', 'lastLoginAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if email is being changed and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateProfileDto.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    Object.assign(user, updateProfileDto);
    return this.userRepository.save(user);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.findOne(id);

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new ConflictException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    user.password = hashedPassword;
    await this.userRepository.save(user);
  }

  async updateUserStatus(id: string, status: UserStatus, reason?: string): Promise<User> {
    const user = await this.findOne(id);
    user.status = status;
    if (reason) {
      user.suspensionReason = reason;
    }
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.find({
      where: { role },
      relations: ['properties', 'bookings', 'reviews', 'wishlist'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForAdmin(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['properties', 'bookings', 'reviews', 'wishlist'],
      order: { createdAt: 'DESC' },
    });
  }
}
