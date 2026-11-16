import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskSoftDelete1794700000000 implements MigrationInterface {
  name = 'TaskSoftDelete1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deleted_at"`);
  }
}
