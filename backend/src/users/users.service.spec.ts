import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should call prisma.user.findUnique with email', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should call prisma.user.create with data', async () => {
      const inputData = { email: 'test@example.com', name: 'Test User' };
      const mockCreatedUser = { id: 'user-1', ...inputData };
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(inputData);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: inputData,
      });
      expect(result).toEqual(mockCreatedUser);
    });
  });
});
