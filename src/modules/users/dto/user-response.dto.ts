import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() createdAt: Date;
}

export class UserWithStatsDto extends UserResponseDto {
  @ApiProperty({ description: 'Tareas terminadas asignadas al usuario' })
  completedTasks: number;

  @ApiProperty({ description: 'Suma del costo de sus tareas terminadas' })
  completedTasksCost: number;
}
