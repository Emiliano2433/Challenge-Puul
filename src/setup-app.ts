import { type INestApplication, ValidationPipe } from '@nestjs/common';

/** Configuración compartida entre main.ts y los tests e2e. */
export function setupApp(app: INestApplication) {
  // rutas versionadas: /v1/...; health queda fuera para los checks de infraestructura
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
