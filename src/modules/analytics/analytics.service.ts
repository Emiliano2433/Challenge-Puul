import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, type User } from '../users/entities/user.entity';
import { AnalyticsRepository } from './analytics.repository';
import type { AnalyticsResponseDto } from './dto/analytics-response.dto';

const ratio = (num: number, den: number) =>
  den ? Math.round((num / den) * 100) / 100 : null;

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria indicada. */
export const todayIn = (timeZone: string, now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly config: ConfigService,
  ) {}

  async get(current: User): Promise<AnalyticsResponseDto> {
    // admin ve todo el equipo; un miembro solo sus propias tareas
    const scope = current.role === UserRole.ADMIN ? null : current.id;
    // "vencida" se mide con la fecha local del equipo, no la del servidor (UTC)
    const today = todayIn(
      this.config.get<string>('APP_TIMEZONE', 'America/Mexico_City'),
    );

    const [overview, estimation, workload] = await Promise.all([
      this.analyticsRepository.overview(scope, today),
      this.analyticsRepository.estimation(scope),
      this.analyticsRepository.workload(scope, today),
    ]);

    return {
      overview: {
        totalTasks: overview.total,
        activeTasks: overview.active,
        doneTasks: overview.done,
        overdueTasks: overview.overdue,
        completionRate: ratio(overview.done, overview.total),
      },
      estimationAccuracy: {
        completedTasks: estimation.completed,
        estimatedHours: estimation.estimated,
        hoursSpent: estimation.spent,
        accuracyRatio: ratio(estimation.spent, estimation.estimated),
        tasksOverEstimate: estimation.over,
      },
      workloadByUser: workload,
    };
  }
}
