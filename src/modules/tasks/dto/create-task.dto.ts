import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'Diseñar login' })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiPropertyOptional({ example: 'Pantalla y validaciones', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 6, description: 'Horas estimadas' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999_999)
  estimatedHours: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Horas invertidas hasta ahora',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999_999)
  hoursSpent?: number;

  @ApiProperty({
    example: '2026-12-01',
    description: 'Fecha de vencimiento (YYYY-MM-DD)',
  })
  @IsDateString({ strict: true })
  dueDate: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ example: 1500, description: 'Costo monetario de la tarea' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999_999)
  cost: number;

  @ApiPropertyOptional({
    type: [Number],
    example: [2, 3],
    description: 'IDs de usuarios asignados',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  assigneeIds?: number[];
}
