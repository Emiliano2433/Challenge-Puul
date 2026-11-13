import { ApiProperty } from '@nestjs/swagger';

export class TasksOverviewDto {
  @ApiProperty() totalTasks: number;
  @ApiProperty() activeTasks: number;
  @ApiProperty() doneTasks: number;
  @ApiProperty({
    description: 'Tareas activas con fecha de vencimiento pasada',
  })
  overdueTasks: number;
  @ApiProperty({ nullable: true, description: 'Terminadas / total' })
  completionRate: number | null;
}

/** ¿Qué tan bien estima el equipo? Solo considera tareas terminadas. */
export class EstimationAccuracyDto {
  @ApiProperty() completedTasks: number;
  @ApiProperty() estimatedHours: number;
  @ApiProperty() hoursSpent: number;
  @ApiProperty({
    nullable: true,
    description:
      'Horas reales / horas estimadas (1 = perfecto, >1 = se subestima)',
  })
  accuracyRatio: number | null;
  @ApiProperty() tasksOverEstimate: number;
}

/** Carga pendiente por usuario: qué tan saturado está cada quien. */
export class UserWorkloadDto {
  @ApiProperty() userId: number;
  @ApiProperty() name: string;
  @ApiProperty() activeTasks: number;
  @ApiProperty() overdueTasks: number;
  @ApiProperty() pendingEstimatedHours: number;
}

export class AnalyticsResponseDto {
  @ApiProperty() overview: TasksOverviewDto;
  @ApiProperty() estimationAccuracy: EstimationAccuracyDto;
  @ApiProperty({ type: [UserWorkloadDto] }) workloadByUser: UserWorkloadDto[];
}
