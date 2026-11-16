import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createApp, resetSchema, seedTeam, task, truncate } from './helpers';

describe('Analítica', () => {
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

  it('admin ve todo el equipo; un miembro solo lo suyo', async () => {
    const { admin, first, second } = team;
    const create = (data: Record<string, unknown>) =>
      http()
        .post('/v1/tasks')
        .set(admin.auth)
        .send(
          task({
            estimatedHours: 10,
            cost: 10,
            dueDate: '2030-01-01',
            ...data,
          }),
        )
        .expect(201);

    await create({
      status: 'done',
      hoursSpent: 12,
      assigneeIds: [first.user.id],
    });
    await create({
      status: 'done',
      hoursSpent: 8,
      assigneeIds: [second.user.id],
    });
    await create({
      status: 'active',
      hoursSpent: 4,
      dueDate: '2020-01-01',
      assigneeIds: [first.user.id],
    }); // vencida

    const { body } = await http()
      .get('/v1/analytics')
      .set(admin.auth)
      .expect(200);
    expect(body.overview).toEqual({
      totalTasks: 3,
      activeTasks: 1,
      doneTasks: 2,
      overdueTasks: 1,
      completionRate: 0.67,
    });
    expect(body.estimationAccuracy).toEqual({
      completedTasks: 2,
      estimatedHours: 20,
      hoursSpent: 20,
      accuracyRatio: 1, // 20h reales / 20h estimadas
      tasksOverEstimate: 1,
    });
    const firstLoad = body.workloadByUser.find(
      (w: any) => w.userId === first.user.id,
    );
    expect(firstLoad).toMatchObject({
      activeTasks: 1,
      overdueTasks: 1,
      pendingEstimatedHours: 6,
    });

    const mine = await http().get('/v1/analytics').set(first.auth).expect(200);
    expect(mine.body.overview.totalTasks).toBe(2);
    expect(mine.body.workloadByUser.map((w: any) => w.userId)).toEqual([
      first.user.id,
    ]);
  });
});
