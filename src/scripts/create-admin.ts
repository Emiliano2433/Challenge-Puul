/**
 * Crea el primer administrador (los usuarios solo los puede crear un admin).
 * Uso: npm run create-admin -- --name "Admin" --email admin@puul.com --password admin12345
 */
import { ConflictException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseArgs } from 'node:util';
import { AppModule } from '../app.module';
import { UserRole } from '../modules/users/entities/user.entity';
import { UsersService } from '../modules/users/users.service';

async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' },
    },
  });
  const { name, email, password } = values;

  if (!name || !email || !password) {
    console.error(
      'Uso: npm run create-admin -- --name "Admin" --email a@b.com --password secreto123',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const user = await app.get(UsersService).create({
      name,
      email: email.toLowerCase(),
      password,
      role: UserRole.ADMIN,
    });
    console.log(`Admin creado: ${user.email} (id=${user.id})`);
  } catch (err) {
    console.error(
      err instanceof ConflictException ? `Error: ${err.message}` : err,
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
