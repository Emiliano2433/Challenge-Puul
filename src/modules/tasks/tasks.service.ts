import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, type User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { TaskFiltersDto } from './dto/task-filters.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus, type Task } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly usersService: UsersService,
  ) {}

  private isAdmin(user: User) {
    return user.role === UserRole.ADMIN;
  }

  /** Admin ve todo; un miembro solo sus tareas. */
  private scope(user: User): number | undefined {
    return this.isAdmin(user) ? undefined : user.id;
  }

  private async getVisible(id: number, user: User): Promise<Task> {
    const task = await this.tasksRepository.findById(id, this.scope(user));
    // 404 también si existe pero no es suya: no revelamos tareas ajenas
    if (!task) throw new NotFoundException('Tarea no encontrada');
    return task;
  }

  async create(dto: CreateTaskDto, current: User): Promise<Task> {
    let assigneeIds = dto.assigneeIds ?? [];
    if (!this.isAdmin(current)) {
      if (assigneeIds.some((id) => id !== current.id)) {
        throw new ForbiddenException(
          'Solo un admin puede asignar tareas a otros usuarios',
        );
      }
      assigneeIds = [current.id]; // un miembro siempre queda asignado a lo que crea
    }

    const { assigneeIds: _ids, ...fields } = dto;
    const task = this.tasksRepository.build({
      ...fields,
      hoursSpent: dto.hoursSpent ?? 0,
      status: dto.status ?? TaskStatus.ACTIVE,
      createdById: current.id,
      assignees: await this.usersService.findByIdsOrFail(assigneeIds),
    });
    const saved = await this.tasksRepository.save(task);
    return (await this.tasksRepository.findById(saved.id))!;
  }

  list(filters: TaskFiltersDto, current: User) {
    if (filters.dueFrom && filters.dueTo && filters.dueFrom > filters.dueTo) {
      throw new BadRequestException('dueFrom no puede ser mayor que dueTo');
    }
    return this.tasksRepository.list(filters, this.scope(current));
  }

  get(id: number, current: User) {
    return this.getVisible(id, current);
  }

  async update(id: number, dto: UpdateTaskDto, current: User): Promise<Task> {
    const task = await this.getVisible(id, current);
    const { assigneeIds, ...changes } = dto;

    if (assigneeIds !== undefined) {
      if (!this.isAdmin(current)) {
        throw new ForbiddenException('Solo un admin puede reasignar tareas');
      }
      task.assignees = await this.usersService.findByIdsOrFail(
        assigneeIds ?? [],
      );
    }

    for (const [field, value] of Object.entries(changes)) {
      if (value === undefined) continue;
      if (value === null && field !== 'description') {
        throw new BadRequestException(`'${field}' no puede ser null`);
      }
      (task as unknown as Record<string, unknown>)[field] = value;
    }

    await this.tasksRepository.save(task);
    return (await this.tasksRepository.findById(id))!;
  }

  async remove(id: number): Promise<void> {
    const task = await this.tasksRepository.findById(id);
    if (!task) throw new NotFoundException('Tarea no encontrada');
    await this.tasksRepository.softDelete(task.id);
  }
}
