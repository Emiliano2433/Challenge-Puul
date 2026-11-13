import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createApp, resetSchema, seedTeam, task, truncate } from './helpers';

describe('Tareas', () => {
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

  it('pide autenticación', async () => {
    await http().get('/tasks').expect(401);
    await http()
      .get('/tasks')
      .set({ Authorization: 'Bearer basura' })
      .expect(401);
  });

  it('un miembro solo ve sus propias tareas', async () => {
    const { admin, first, second } = team;

    const own = await http()
      .post('/tasks')
      .set(first.auth)
      .send(task({ title: 'Del primero' }))
      .expect(201);
    expect(own.body.assignees.map((u: any) => u.id)).toEqual([first.user.id]); // se auto-asigna

    const other = await http()
      .post('/tasks')
      .set(admin.auth)
      .send(task({ title: 'Del segundo', assigneeIds: [second.user.id] }))
      .expect(201);

    const mine = await http().get('/tasks').set(first.auth).expect(200);
    expect(mine.body.map((t: any) => t.title)).toEqual(['Del primero']);

    await http().get(`/tasks/${other.body.id}`).set(first.auth).expect(404);
    await http()
      .patch(`/tasks/${other.body.id}`)
      .set(first.auth)
      .send({ title: 'x' })
      .expect(404);

    const all = await http().get('/tasks').set(admin.auth).expect(200);
    expect(all.body).toHaveLength(2);
  });

  it('un miembro no puede asignar a otros ni borrar', async () => {
    const { admin, first, second } = team;

    await http()
      .post('/tasks')
      .set(first.auth)
      .send(task({ assigneeIds: [second.user.id] }))
      .expect(403);

    const t = await http()
      .post('/tasks')
      .set(first.auth)
      .send(task())
      .expect(201);
    await http()
      .patch(`/tasks/${t.body.id}`)
      .set(first.auth)
      .send({ assigneeIds: [second.user.id] })
      .expect(403);
    await http().delete(`/tasks/${t.body.id}`).set(first.auth).expect(403);
    await http().delete(`/tasks/${t.body.id}`).set(admin.auth).expect(204);
    await http().get(`/tasks/${t.body.id}`).set(admin.auth).expect(404);
  });

  it('actualiza cualquier campo y reasigna usuarios', async () => {
    const { admin, first, second } = team;
    const t = await http()
      .post('/tasks')
      .set(admin.auth)
      .send(task({ assigneeIds: [first.user.id] }))
      .expect(201);

    const res = await http()
      .patch(`/tasks/${t.body.id}`)
      .set(admin.auth)
      .send({
        estimatedHours: 8.5,
        status: 'done',
        assigneeIds: [second.user.id, first.user.id],
      })
      .expect(200);
    expect(res.body.estimatedHours).toBe(8.5);
    expect(res.body.status).toBe('done');
    expect(res.body.assignees.map((u: any) => u.id)).toEqual(
      [first.user.id, second.user.id].sort((a, b) => a - b),
    );

    // el miembro puede registrar horas en su propia tarea
    const hours = await http()
      .patch(`/tasks/${t.body.id}`)
      .set(first.auth)
      .send({ hoursSpent: 4 })
      .expect(200);
    expect(hours.body.hoursSpent).toBe(4);

    await http()
      .patch(`/tasks/${t.body.id}`)
      .set(admin.auth)
      .send({ assigneeIds: [999] })
      .expect(422);
    await http()
      .patch(`/tasks/${t.body.id}`)
      .set(admin.auth)
      .send({ cost: -5 })
      .expect(400);
  });

  it('combina filtros y ordena de la más reciente a la menos reciente', async () => {
    const { admin, first, second } = team;
    const create = (title: string, dueDate: string, assigneeIds: number[]) =>
      http()
        .post('/tasks')
        .set(admin.auth)
        .send(task({ title, dueDate, assigneeIds }))
        .expect(201);

    await create('Diseño login', '2030-01-01', [first.user.id]);
    await create('API login', '2030-02-01', [second.user.id]);
    await create('Deploy', '2030-02-01', [first.user.id, second.user.id]);

    const titles = async (query: Record<string, unknown>) =>
      (
        await http().get('/tasks').query(query).set(admin.auth).expect(200)
      ).body.map((t: any) => t.title);

    expect(await titles({})).toEqual(['Deploy', 'API login', 'Diseño login']);
    expect(await titles({ title: 'login' })).toEqual([
      'API login',
      'Diseño login',
    ]);
    expect(await titles({ dueDate: '2030-02-01' })).toEqual([
      'Deploy',
      'API login',
    ]);
    expect(
      await titles({ dueFrom: '2030-01-15', dueTo: '2030-03-01' }),
    ).toEqual(['Deploy', 'API login']);
    expect(await titles({ assigneeId: first.user.id })).toEqual([
      'Deploy',
      'Diseño login',
    ]);
    expect(await titles({ userName: 'segundo' })).toEqual([
      'Deploy',
      'API login',
    ]);
    expect(await titles({ userEmail: 'primero@' })).toEqual([
      'Deploy',
      'Diseño login',
    ]);
    expect(
      await titles({
        title: 'login',
        userName: 'segundo',
        dueDate: '2030-02-01',
      }),
    ).toEqual(['API login']);
    expect(await titles({ limit: 1, offset: 1 })).toEqual(['API login']);

    await http()
      .get('/tasks')
      .query({ dueFrom: '2030-02-01', dueTo: '2030-01-01' })
      .set(admin.auth)
      .expect(400);
  });
});
