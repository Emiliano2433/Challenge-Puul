import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class TaskFiltersDto {
  @ApiPropertyOptional({ description: 'Búsqueda parcial por título' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Fecha de vencimiento exacta (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Vencen desde esta fecha' })
  @IsOptional()
  @IsDateString({ strict: true })
  dueFrom?: string;

  @ApiPropertyOptional({ description: 'Vencen hasta esta fecha' })
  @IsOptional()
  @IsDateString({ strict: true })
  dueTo?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'ID de un usuario asignado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigneeId?: number;

  @ApiPropertyOptional({ description: 'Nombre (parcial) de algún asignado' })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ description: 'Correo (parcial) de algún asignado' })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
