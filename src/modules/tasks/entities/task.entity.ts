import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { User } from '../../users/entities/user.entity';

export enum TaskStatus {
  ACTIVE = 'active',
  DONE = 'done',
}

@Entity('tasks')
@Check('ck_tasks_estimated_hours_positive', '"estimated_hours" >= 0')
@Check('ck_tasks_hours_spent_positive', '"hours_spent" >= 0')
@Check('ck_tasks_cost_positive', '"cost" >= 0')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'estimated_hours',
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: decimalTransformer,
  })
  estimatedHours: number;

  @Column({
    name: 'hours_spent',
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  hoursSpent: number;

  @Index()
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Index()
  @Column({
    type: 'enum',
    enum: TaskStatus,
    enumName: 'task_status',
    default: TaskStatus.ACTIVE,
  })
  status: TaskStatus;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  cost: number;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** Soft delete: TypeORM excluye estas filas de las consultas por entidad. */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @ManyToMany(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinTable({
    name: 'task_assignees',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignees: User[];
}
