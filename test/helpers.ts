import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { buildDataSourceOptions } from '../src/database/data-source';
import { User, UserRole } from '../src/modules/users/entities/user.entity';
import { setupApp } from '../src/setup-app';

export const PASSWORD = 'password123';

/** Recrea el esquema de la BD de pruebas desde las entidades. */
export async function resetSchema() {
  const ds = new DataSource({
    ...buildDataSourceOptions(process.env.DATABASE_URL),
    migrations: [],
    synchronize: true,
    dropSchema: true,
  });
  await ds.initialize();
  await ds.destroy();
}

export async function createApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();
  return app;
}

export async function truncate(app: INestApplication) {
  await app
    .get(DataSource, { strict: false })
    .query('TRUNCATE task_assignees, tasks, users RESTART IDENTITY CASCADE');
}

export async function makeUser(
  app: INestApplication<App>,
  name: string,
  email: string,
  role: UserRole,
): Promise<{ user: User; auth: { Authorization: string } }> {
  const repo = app.get<DataSource>(getDataSourceToken()).getRepository(User);
  const user = await repo.save(
    repo.create({
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    }),
  );
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return { user, auth: { Authorization: `Bearer ${res.body.accessToken}` } };
}

/** Un admin + dos miembros. */
export async function seedTeam(app: INestApplication<App>) {
  const admin = await makeUser(
    app,
    'Usuario Admin',
    'admin@puul.com',
    UserRole.ADMIN,
  );
  const first = await makeUser(
    app,
    'Primer Miembro',
    'primero@puul.com',
    UserRole.MEMBER,
  );
  const second = await makeUser(
    app,
    'Segundo Miembro',
    'segundo@puul.com',
    UserRole.MEMBER,
  );
  return { admin, first, second };
}

export const task = (overrides: Record<string, unknown> = {}) => ({
  title: 'Tarea',
  estimatedHours: 3,
  dueDate: '2030-01-10',
  cost: 100,
  ...overrides,
});
