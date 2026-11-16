import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createApp, resetSchema } from './helpers';

describe('Rate limiting', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await resetSchema();
    process.env.THROTTLE_ENABLED = 'true';
    app = await createApp();
  });
  afterAll(async () => {
    process.env.THROTTLE_ENABLED = 'false';
    await app.close();
  });

  it('bloquea el sexto intento de login en un minuto', async () => {
    const body = { email: 'nadie@puul.com', password: 'incorrecta' };
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      codes.push(
        (await request(app.getHttpServer()).post('/v1/auth/login').send(body))
          .status,
      );
    }
    expect(codes).toEqual([401, 401, 401, 401, 401, 429]);
  });
});
