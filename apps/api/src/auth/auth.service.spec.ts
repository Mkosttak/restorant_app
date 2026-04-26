import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Partial<PrismaService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;
  let redisService: Partial<RedisService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@bolena.com',
    name: 'Test User',
    role: 'ADMIN',
    passwordHash: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 10);

    prisma = {
      user: {
        findUnique: jest.fn(),
      } as unknown as PrismaService['user'],
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn().mockReturnValue({
        sub: 'user-1',
        email: 'test@bolena.com',
        role: 'ADMIN',
      }),
    };

    configService = {
      get: jest.fn().mockReturnValue('mock-secret'),
    };

    redisService = {
      exists: jest.fn().mockResolvedValue(false),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@bolena.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@bolena.com');
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('should throw error for invalid email', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@email.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for invalid password', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@bolena.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for inactive user', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login({ email: 'test@bolena.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(redisService.set).toHaveBeenCalledWith(
        'bl:valid-refresh-token',
        '1',
        expect.any(Number),
      );
    });

    it('should reject blacklisted token', async () => {
      (redisService.exists as jest.Mock).mockResolvedValue(true);

      await expect(service.refresh('blacklisted-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user without password', async () => {
      (prisma.user!.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@bolena.com');
    });
  });

  describe('logout', () => {
    it('should blacklist refresh token', async () => {
      await service.logout('some-refresh-token');

      expect(redisService.set).toHaveBeenCalledWith(
        'bl:some-refresh-token',
        '1',
        expect.any(Number),
      );
    });
  });
});
