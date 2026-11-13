import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TaskStatus } from '../tasks/entities/task.entity';
import type { UserFiltersDto } from './dto/user-filters.dto';
import type { UserWithStatsDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  create(data: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  findByIds(ids: number[]): Promise<User[]> {
    return ids.length ? this.repo.findBy({ id: In(ids) }) : Promise.resolve([]);
  }

  /** Incluye el hash para validar la contraseña en el login. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getExists();
  }

  /** Usuarios + cantidad y costo total de sus tareas terminadas. */
  async listWithStats(filters: UserFiltersDto): Promise<UserWithStatsDto[]> {
    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoin('task_assignees', 'ta', 'ta.user_id = u.id')
      .leftJoin('tasks', 't', 't.id = ta.task_id AND t.status = :done', {
        done: TaskStatus.DONE,
      })
      .select([
        'u.id AS id',
        'u.name AS name',
        'u.email AS email',
        'u.role AS role',
        'u.created_at AS "createdAt"',
        'COUNT(t.id)::int AS "completedTasks"',
        'COALESCE(SUM(t.cost), 0) AS "completedTasksCost"',
      ])
      .groupBy('u.id')
      .orderBy('u.id');

    if (filters.name)
      qb.andWhere('u.name ILIKE :name', { name: `%${filters.name}%` });
    if (filters.email)
      qb.andWhere('u.email ILIKE :email', { email: `%${filters.email}%` });
    if (filters.role) qb.andWhere('u.role = :role', { role: filters.role });

    const rows = await qb.getRawMany<
      Omit<UserWithStatsDto, 'completedTasksCost'> & {
        completedTasksCost: string;
      }
    >();
    return rows.map((r) => ({
      ...r,
      completedTasksCost: Number(r.completedTasksCost),
    }));
  }
}
