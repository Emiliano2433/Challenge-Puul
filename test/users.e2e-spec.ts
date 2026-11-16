import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createApp, resetSchema, seedTeam, task, truncate } from './helpers';

describe('Usuarios', () => {
  let app: INestApplication<App>;
  let team: Awaited<ReturnType<typeof seedTeam>>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    await resetSchema();
    app = await createApp();
  });
  beforeEach(async () => {
    await truncate(app);
    team = await seedTeam(app);
  });
  afterAll(() => app.close());

  it('solo un admin crea usuarios y no se repiten correos', async () => {
    const body = {
      name: 'Nuevo',
      email: 'nuevo@puul.com',
      role: 'member',
      password: 'password123',
    };

    await http().post('/v1/users').set(team.first.auth).send(body).expect(403);
    const res = await http()
      .post('/v1/users')
      .set(team.admin.auth)
      .send(body)
      .expect(201);
    expect(res.body.email).toBe('nuevo@puul.com');
    expect(res.body).not.toHaveProperty('passwordHash');

    await http().post('/v1/users').set(team.admin.auth).send(body).expect(409);
  });

  it('valida los datos de entrada', async () => {
    await http()
      .post('/v1/users')
      .set(team.admin.auth)
      .send({ name: 'X', email: 'no-es-correo', role: 'jefe', password: '123' })
      .expect(400);
  });

  it('lista usuarios con sus tareas terminadas, su costo y filtros', async () => {
    const { admin, first, second } = team;
    const create = (cost: number, status: string, assigneeIds: number[]) =>
      http()
        .post('/v1/tasks')
        .set(admin.auth)
        .send(task({ cost, status, assigneeIds }))
        .expect(201);

    await create(100, 'done', [first.user.id, second.user.id]);
    await create(50.5, 'done', [first.user.id]);
    await create(999, 'active', [first.user.id]);

    const res = await http().get('/v1/users').set(admin.auth).expect(200);
    const byEmail = Object.fromEntries(res.body.map((u: any) => [u.email, u]));
    expect(byEmail['primero@puul.com']).toMatchObject({
      completedTasks: 2,
      completedTasksCost: 150.5,
    });
    expect(byEmail['segundo@puul.com']).toMatchObject({
      completedTasks: 1,
      completedTasksCost: 100,
    });
    expect(byEmail['admin@puul.com']).toMatchObject({
      completedTasks: 0,
      completedTasksCost: 0,
    });

    const filtered = await http()
      .get('/v1/users')
      .query({ role: 'member', name: 'segundo' })
      .set(admin.auth)
      .expect(200);
    expect(filtered.body.map((u: any) => u.email)).toEqual([
      'segundo@puul.com',
    ]);

    const byMail = await http()
      .get('/v1/users')
      .query({ email: 'PRIMERO' })
      .set(admin.auth)
      .expect(200);
    expect(byMail.body.map((u: any) => u.email)).toEqual(['primero@puul.com']);

    await http().get('/v1/users').set(first.auth).expect(403);
  });
});
