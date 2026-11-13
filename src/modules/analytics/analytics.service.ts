import { Injectable } from '@nestjs/common';
import { UserRole, type User } from '../users/entities/user.entity';
import { AnalyticsRepository } from './analytics.repository';
import type { AnalyticsResponseDto } from './dto/analytics-response.dto';

const ratio = (num: number, den: number) =>
  den ? Math.round((num / den) * 100) / 100 : null;

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async get(current: User): Promise<AnalyticsResponseDto> {
    // admin ve todo el equipo; un miembro solo sus propias tareas
    const scope = current.role === UserRole.ADMIN ? null : current.id;

    const [overview, estimation, workload] = await Promise.all([
      this.analyticsRepository.overview(scope),
      this.analyticsRepository.estimation(scope),
      this.analyticsRepository.workload(scope),
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
