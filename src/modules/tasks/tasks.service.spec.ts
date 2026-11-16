import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole, type User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { TaskStatus, type Task } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

const admin = { id: 1, role: UserRole.ADMIN } as User;
const member = { id: 2, role: UserRole.MEMBER } as User;

const makeTask = (overrides: Partial<Task> = {}) =>
  ({
    id: 10,
    title: 'Tarea',
    description: null,
    estimatedHours: 3,
    hoursSpent: 0,
    dueDate: '2030-01-10',
    status: TaskStatus.ACTIVE,
    cost: 100,
    assignees: [member],
    ...overrides,
  }) as Task;

describe('TasksService', () => {
  let service: TasksService;
  let repo: jest.Mocked<
    Pick<TasksRepository, 'build' | 'save' | 'findById' | 'list' | 'softDelete'>
  >;
  let users: jest.Mocked<Pick<UsersService, 'findByIdsOrFail'>>;

  beforeEach(async () => {
    repo = {
      build: jest.fn((data) => data as Task),
      save: jest.fn((task) => Promise.resolve({ ...task, id: 10 })),
      findById: jest.fn(),
      list: jest.fn(),
      softDelete: jest.fn(),
    };
    users = {
      findByIdsOrFail: jest.fn((ids: number[]) =>
        Promise.resolve(ids.map((id) => ({ id }) as User)),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: repo },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  describe('create', () => {
    const dto = {
      title: 'Nueva',
      estimatedHours: 2,
      dueDate: '2030-01-10',
      cost: 50,
    };

    it('un miembro queda asignado a lo que crea', async () => {
      repo.findById.mockResolvedValue(makeTask());

      await service.create(dto, member);

      expect(users.findByIdsOrFail).toHaveBeenCalledWith([member.id]);
      expect(repo.build).toHaveBeenCalledWith(
        expect.objectContaining({
          createdById: member.id,
          hoursSpent: 0,
          status: TaskStatus.ACTIVE,
        }),
      );
    });

    it('un miembro no puede asignar a otros usuarios', async () => {
      await expect(
        service.create({ ...dto, assigneeIds: [3] }, member),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('un admin asigna a quien quiera', async () => {
      repo.findById.mockResolvedValue(makeTask());

      await service.create({ ...dto, assigneeIds: [2, 3] }, admin);

      expect(users.findByIdsOrFail).toHaveBeenCalledWith([2, 3]);
    });
  });

  describe('list', () => {
    it('rechaza dueFrom mayor que dueTo', () => {
      expect(() =>
        service.list(
          { dueFrom: '2030-02-01', dueTo: '2030-01-01', limit: 20, offset: 0 },
          admin,
        ),
      ).toThrow(BadRequestException);
    });

    it('un miembro solo ve sus tareas; un admin todas', async () => {
      repo.list.mockResolvedValue([]);
      const filters = { limit: 20, offset: 0 };

      await service.list(filters, member);
      await service.list(filters, admin);

      expect(repo.list).toHaveBeenNthCalledWith(1, filters, member.id);
      expect(repo.list).toHaveBeenNthCalledWith(2, filters, undefined);
    });
  });

  describe('update', () => {
    it('404 si la tarea no es visible para el usuario', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update(10, { title: 'x' }, member)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.findById).toHaveBeenCalledWith(10, member.id);
    });

    it('un miembro no puede reasignar', async () => {
      repo.findById.mockResolvedValue(makeTask());

      await expect(
        service.update(10, { assigneeIds: [3] }, member),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no permite null en campos obligatorios', async () => {
      repo.findById.mockResolvedValue(makeTask());

      await expect(
        service.update(10, { title: null } as never, member),
      ).rejects.toThrow(BadRequestException);
    });

    it('aplica los cambios y guarda', async () => {
      const task = makeTask();
      repo.findById.mockResolvedValue(task);

      await service.update(
        10,
        { hoursSpent: 4, status: TaskStatus.DONE, description: null },
        member,
      );

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          hoursSpent: 4,
          status: TaskStatus.DONE,
          description: null,
        }),
      );
    });
  });

  describe('remove', () => {
    it('hace soft delete', async () => {
      repo.findById.mockResolvedValue(makeTask());

      await service.remove(10);

      expect(repo.softDelete).toHaveBeenCalledWith(10);
    });

    it('404 si la tarea no existe', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove(10)).rejects.toThrow(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
