import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { UserWorkloadDto } from './dto/analytics-response.dto';

interface OverviewRow {
  total: number;
  active: number;
  done: number;
  overdue: number;
}

interface EstimationRow {
  completed: number;
  estimated: number;
  spent: number;
  over: number;
}

/** Consultas agregadas en SQL. userId = null -> todo el equipo. */
@Injectable()
export class AnalyticsRepository {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  private readonly scoped = `
    SELECT * FROM tasks t
    WHERE $1::int IS NULL
       OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $1)`;

  async overview(userId: number | null): Promise<OverviewRow> {
    const [row] = await this.db.query<OverviewRow[]>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'active')::int AS active,
              COUNT(*) FILTER (WHERE status = 'done')::int AS done,
              COUNT(*) FILTER (WHERE status = 'active' AND due_date < CURRENT_DATE)::int AS overdue
         FROM (${this.scoped}) s`,
      [userId],
    );
    return row;
  }

  async estimation(userId: number | null): Promise<EstimationRow> {
    const [row] = await this.db.query<EstimationRow[]>(
      `SELECT COUNT(*)::int AS completed,
              COALESCE(SUM(estimated_hours), 0)::float AS estimated,
              COALESCE(SUM(hours_spent), 0)::float AS spent,
              COUNT(*) FILTER (WHERE hours_spent > estimated_hours)::int AS over
         FROM (${this.scoped}) s
        WHERE status = 'done'`,
      [userId],
    );
    return row;
  }

  workload(userId: number | null): Promise<UserWorkloadDto[]> {
    return this.db.query<UserWorkloadDto[]>(
      `SELECT u.id AS "userId",
              u.name,
              COUNT(t.id) FILTER (WHERE t.status = 'active')::int AS "activeTasks",
              COUNT(t.id) FILTER (WHERE t.status = 'active' AND t.due_date < CURRENT_DATE)::int AS "overdueTasks",
              COALESCE(SUM(GREATEST(t.estimated_hours - t.hours_spent, 0))
                       FILTER (WHERE t.status = 'active'), 0)::float AS "pendingEstimatedHours"
         FROM users u
         LEFT JOIN task_assignees ta ON ta.user_id = u.id
         LEFT JOIN tasks t ON t.id = ta.task_id
        WHERE $1::int IS NULL OR u.id = $1
        GROUP BY u.id
        ORDER BY u.id`,
      [userId],
    );
  }
}
