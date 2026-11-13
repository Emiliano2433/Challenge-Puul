import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUsersAndTasks1794530478361 implements MigrationInterface {
  name = 'InitUsersAndTasks1794530478361';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('member', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'member', "password_hash" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."task_status" AS ENUM('active', 'done')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "title" character varying(200) NOT NULL, "description" text, "estimated_hours" numeric(8,2) NOT NULL, "hours_spent" numeric(8,2) NOT NULL DEFAULT '0', "due_date" date NOT NULL, "status" "public"."task_status" NOT NULL DEFAULT 'active', "cost" numeric(12,2) NOT NULL, "created_by_id" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_tasks_cost_positive" CHECK ("cost" >= 0), CONSTRAINT "ck_tasks_hours_spent_positive" CHECK ("hours_spent" >= 0), CONSTRAINT "ck_tasks_estimated_hours_positive" CHECK ("estimated_hours" >= 0), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_067be4bd67747aa64451933929" ON "tasks"  ("title") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_707cfc415c7c12d38dfc2ec8eb" ON "tasks"  ("due_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6086c8dafbae729a930c04d865" ON "tasks"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb3724030e9674f2c17b7573aa" ON "tasks"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "task_assignees" ("task_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_7ae8012667c1cc4ca8266002afc" PRIMARY KEY ("task_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0141288f2306f20da9a60ec8d6" ON "task_assignees"  ("task_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb8051e376a2b083e074678cb6" ON "task_assignees"  ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_0804c9432857e4d333583f5afe1" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_assignees" ADD CONSTRAINT "FK_0141288f2306f20da9a60ec8d69" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_assignees" ADD CONSTRAINT "FK_bb8051e376a2b083e074678cb60" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_assignees" DROP CONSTRAINT "FK_bb8051e376a2b083e074678cb60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_assignees" DROP CONSTRAINT "FK_0141288f2306f20da9a60ec8d69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_0804c9432857e4d333583f5afe1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb8051e376a2b083e074678cb6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0141288f2306f20da9a60ec8d6"`,
    );
    await queryRunner.query(`DROP TABLE "task_assignees"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb3724030e9674f2c17b7573aa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6086c8dafbae729a930c04d865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_707cfc415c7c12d38dfc2ec8eb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_067be4bd67747aa64451933929"`,
    );
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TYPE "public"."task_status"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
  }
}
