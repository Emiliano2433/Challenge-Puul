import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import type { TaskFiltersDto } from './dto/task-filters.dto';
import { Task } from './entities/task.entity';

/**
 * EXISTS sobre los asignados de la tarea: permite combinar varios filtros
 * por usuario sin duplicar filas.
 */
function whereHasAssignee(
  qb: SelectQueryBuilder<Task>,
  alias: string,
  condition: string,
  params: Record<string, unknown>,
) {
  qb.andWhere(
    `EXISTS (SELECT 1 FROM task_assignees ${alias}_ta JOIN users ${alias}_u ON ${alias}_u.id = ${alias}_ta.user_id ` +
      `WHERE ${alias}_ta.task_id = t.id AND (${condition}))`,
    params,
  );
}

function sortAssignees(task: Task): Task {
  task.assignees.sort((a, b) => a.id - b.id);
  return task;
}

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
  ) {}

  save(task: Task): Promise<Task> {
    return this.repo.save(task);
  }

  build(data: Partial<Task>): Task {
    return this.repo.create(data);
  }

  /** Soft delete: llena deleted_at en lugar de borrar la fila. */
  async softDelete(id: number): Promise<void> {
    await this.repo.softDelete(id);
  }

  /** visibleTo = undefined -> cualquier tarea (admin); visibleTo = id -> solo si está asignada. */
  async findById(id: number, visibleTo?: number): Promise<Task | null> {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignees', 'a')
      .where('t.id = :id', { id });
    if (visibleTo !== undefined)
      whereHasAssignee(qb, 'v', 'v_u.id = :visibleTo', { visibleTo });
    const task = await qb.getOne();
    return task && sortAssignees(task);
  }

  async list(filters: TaskFiltersDto, visibleTo?: number): Promise<Task[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignees', 'a');

    if (visibleTo !== undefined)
      whereHasAssignee(qb, 'v', 'v_u.id = :visibleTo', { visibleTo });
    if (filters.title)
      qb.andWhere('t.title ILIKE :title', { title: `%${filters.title}%` });
    if (filters.dueDate)
      qb.andWhere('t.due_date = :dueDate', { dueDate: filters.dueDate });
    if (filters.dueFrom)
      qb.andWhere('t.due_date >= :dueFrom', { dueFrom: filters.dueFrom });
    if (filters.dueTo)
      qb.andWhere('t.due_date <= :dueTo', { dueTo: filters.dueTo });
    if (filters.status)
      qb.andWhere('t.status = :status', { status: filters.status });
    if (filters.assigneeId !== undefined) {
      whereHasAssignee(qb, 'f', 'f_u.id = :assigneeId', {
        assigneeId: filters.assigneeId,
      });
    }
    if (filters.userName || filters.userEmail) {
      // nombre y correo tienen que coincidir en el mismo asignado
      const conditions: string[] = [];
      const params: Record<string, unknown> = {};
      if (filters.userName) {
        conditions.push('n_u.name ILIKE :userName');
        params.userName = `%${filters.userName}%`;
      }
      if (filters.userEmail) {
        conditions.push('n_u.email ILIKE :userEmail');
        params.userEmail = `%${filters.userEmail}%`;
      }
      whereHasAssignee(qb, 'n', conditions.join(' AND '), params);
    }

    // ojo: no ordenar por columnas de asignados aquí, rompe la paginación (skip/take)
    const tasks = await qb
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .skip(filters.offset)
      .take(filters.limit)
      .getMany();
    return tasks.map(sortAssignees);
  }
}
