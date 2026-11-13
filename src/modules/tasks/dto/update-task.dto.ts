import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

/** Todos los campos opcionales: solo se actualiza lo que se envía. */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
