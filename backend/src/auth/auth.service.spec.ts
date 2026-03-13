import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuthService } from './auth.service.fixed';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;
  let notificationsService: any;
  let cacheManager: any;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockNotificationsService = {
    sendHostSignupNotification: jest.fn(),
  };

  const mockCacheManager = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    notificationsService = module.get(NotificationsService);
    cacheManager = module.get(CACHE_MANAGER);

    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$mockedpassword');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
      };

      const mockUser = {
        id: '1',
        ...signupDto,
        role: 'customer',
        status: 'active',
      };

      mockUserRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.signup(signupDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const signupDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const existingUser = {
        id: '1',
        email: 'existing@example.com',
      };

      mockUserRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingUser),
      });

      await expect(service.signup(signupDto)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        role: 'customer',
        status: 'active',
        firstName: 'John',
        lastName: 'Doe',
        profileImage: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(mockCacheManager.set).toHaveBeenCalledTimes(2); // session and profile cache
    });

    it('should throw error for invalid credentials', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should clear user cache on logout', async () => {
      const userId = 'user-123';

      mockCacheManager.del.mockResolvedValue(undefined);

      await service.logout(userId);

      expect(mockCacheManager.del).toHaveBeenCalledWith('user_session:user-123');
      expect(mockCacheManager.del).toHaveBeenCalledWith('user_profile:user-123');
    });
  });

  describe('cache operations', () => {
    it('should cache user session on login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        role: 'customer',
        status: 'active',
        firstName: 'John',
        lastName: 'Doe',
        profileImage: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.login(loginDto);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'user_session:1',
        expect.objectContaining({
          userId: '1',
          email: 'test@example.com',
          role: 'customer',
        }),
        3600000 // 1 hour
      );
    });
  });
});
