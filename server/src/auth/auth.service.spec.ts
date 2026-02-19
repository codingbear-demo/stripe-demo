import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should create a new user when username does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'uuid-1',
      username: 'testuser',
      password: 'pass',
    });

    const result = await service.login('testuser', 'pass');

    expect(result).toEqual({ id: 'uuid-1', username: 'testuser' });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { username: 'testuser', password: 'pass' },
    });
  });

  it('should return existing user with correct password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      username: 'testuser',
      password: 'correctpass',
    });

    const result = await service.login('testuser', 'correctpass');

    expect(result).toEqual({ id: 'uuid-1', username: 'testuser' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException for wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      username: 'testuser',
      password: 'correctpass',
    });

    await expect(service.login('testuser', 'wrongpass')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
