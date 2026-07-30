import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../inbox/activity-log.service';
import { InboxGateway } from '../inbox/inbox.gateway';

describe('ContactsService', () => {
  let service: ContactsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      contact: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      contactNote: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ActivityLogService, useValue: { record: jest.fn().mockResolvedValue(true) } },
        { provide: InboxGateway, useValue: { broadcastToTenant: jest.fn() } },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContactNotes', () => {
    it('should return contact notes', async () => {
      prismaService.contact.findFirst.mockResolvedValue({ id: 'c1', tenantId: 't1' });
      prismaService.contactNote.findMany.mockResolvedValue([{ id: 'n1', content: 'Note 1' }]);

      const notes = await service.getContactNotes('t1', 'c1');
      expect(notes).toHaveLength(1);
      expect(notes[0].content).toBe('Note 1');
    });
  });

  describe('createContactNote', () => {
    it('should create a contact note', async () => {
      prismaService.contact.findFirst.mockResolvedValue({ id: 'c1', tenantId: 't1', conversations: [{ id: 'conv1' }] });
      prismaService.contactNote.create.mockResolvedValue({ id: 'n1', content: 'New Note' });

      const note = await service.createContactNote('t1', 'c1', 'New Note', { id: 'u1' });
      expect(note.content).toBe('New Note');
    });
  });
});
