# Challenge Puul — API de gestión de tareas

API para gestionar las tareas de un equipo: usuarios, tareas con fecha de entrega y asignación
múltiple, estimación y seguimiento de horas, costo por tarea y analítica.

**Stack:** Node.js · NestJS 11 · TypeScript · PostgreSQL 17 · TypeORM · JWT · @nestjs/throttler · Swagger

## Requisitos

- Node.js 20 o superior
- Docker (para levantar PostgreSQL), o un PostgreSQL propio

## Instalación

```bash
git clone https://github.com/Emiliano2433/Challenge-Puul.git
cd Challenge-Puul

# 1. Base de datos (queda en localhost:5433 para no chocar con otro Postgres local)
docker compose up -d

# 2. Dependencias
npm install

# 3. Variables de entorno
cp .env.example .env               # cambia JWT_SECRET si lo vas a desplegar

# 4. Migraciones
npm run migration:run

# 5. Primer administrador (los usuarios solo los puede crear un admin)
npm run create-admin -- --name "Admin" --email admin@puul.com --password admin12345
```

> Si usas tu propio PostgreSQL, ajusta `DATABASE_URL` en `.env`.

## Correr la API

```bash
npm run start:dev      # desarrollo, se recarga sola
# o
npm run build && npm run start:prod
```

- Swagger: http://localhost:3000/docs
- Health check: http://localhost:3000/health

En VS Code también puedes usar **Run and Debug → "API (nest start:debug)"**.

### Autenticación

1. `POST /auth/login` con `{"email": "...", "password": "..."}` devuelve un `accessToken`.
2. Envía el token en cada petición: `Authorization: Bearer <token>`.
   En Swagger usa el botón **Authorize**.

## Endpoints

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | Inicia sesión y devuelve un JWT |
| GET | `/auth/me` | autenticado | Usuario actual |
| POST | `/users` | admin | Crea un usuario (nombre, correo, rol `member`/`admin`, contraseña) |
| GET | `/users` | admin | Lista usuarios con `completedTasks` y `completedTasksCost`. Filtros: `name`, `email`, `role` |
| POST | `/tasks` | autenticado | Crea una tarea |
| GET | `/tasks` | autenticado | Lista tareas, de la más reciente a la menos reciente |
| GET | `/tasks/:id` | autenticado | Detalle de una tarea |
| PATCH | `/tasks/:id` | autenticado | Actualiza cualquier campo, incluidas horas y asignados |
| DELETE | `/tasks/:id` | admin | Elimina una tarea (soft delete con `deletedAt`) |
| GET | `/analytics` | autenticado | Estadísticas del equipo (o propias si eres miembro) |

### Tarea

```json
{
  "title": "Diseñar login",
  "description": "Pantalla y validaciones",
  "estimatedHours": 6,
  "hoursSpent": 0,
  "dueDate": "2026-12-01",
  "status": "active",
  "cost": 1500,
  "assigneeIds": [2, 3]
}
```

`status` puede ser `active` o `done`. `hoursSpent` sirve para registrar el tiempo invertido.

### Filtros de `GET /tasks` (se pueden combinar)

| Parámetro | Ejemplo | Descripción |
|---|---|---|
| `title` | `login` | Búsqueda parcial en el título |
| `dueDate` | `2026-12-01` | Fecha de vencimiento exacta |
| `dueFrom` / `dueTo` | `2026-12-01` | Rango de fechas de vencimiento |
| `status` | `done` | Estado |
| `assigneeId` | `3` | Usuario asignado |
| `userName` | `miembro` | Nombre parcial de algún asignado |
| `userEmail` | `@puul.com` | Correo parcial de algún asignado |
| `limit` / `offset` | `20` / `40` | Paginación (máx. 200) |

Ejemplo: `GET /tasks?title=login&userName=miembro&dueFrom=2026-12-01`

### Analítica

`GET /analytics` devuelve:

- **Precisión de estimación** (`estimationAccuracy`): en tareas terminadas, horas estimadas vs.
  horas reales, la razón entre ambas (1 = estimación perfecta; >1 = el equipo subestima) y
  cuántas tareas se pasaron de lo estimado.
- **Carga de trabajo por usuario** (`workloadByUser`): tareas activas, tareas vencidas y horas
  pendientes estimadas de cada persona, para detectar a quién se está saturando.
- Además un resumen (`overview`): totales, tareas vencidas y tasa de finalización.

Una tarea está vencida si sigue activa y su `dueDate` ya pasó según la fecha local de
`APP_TIMEZONE` (por defecto `America/Mexico_City`), no la del servidor en UTC.
Las tareas eliminadas (soft delete) no cuentan en la analítica ni en las estadísticas de usuarios.

## Seguridad y permisos

- **Roles:** solo un admin crea usuarios, lista usuarios, elimina tareas y asigna/reasigna tareas
  a otras personas (`@Roles(UserRole.ADMIN)` + `RolesGuard`).
- **Aislamiento:** un miembro solo ve, edita y obtiene analítica de las tareas donde está asignado.
  Si intenta acceder a una tarea ajena recibe `404` (no se revela que existe).
  Las tareas que crea un miembro se le asignan a él mismo.
- **Rate limiting** con `@nestjs/throttler` (por IP); al excederlo se responde `429`:

  | Endpoint | Límite |
  |---|---|
  | `POST /auth/login` | 5 / minuto |
  | `POST /users` | 10 / minuto |
  | `DELETE /tasks/:id` | 10 / minuto |
  | `POST /tasks` | 30 / minuto |
  | `PATCH /tasks/:id` | 60 / minuto |
  | resto | 120 / minuto |

- Contraseñas con bcrypt; tokens JWT con expiración configurable (`JWT_EXPIRES_IN`).
- Validación de entrada con `class-validator`; se rechazan campos no esperados.

## Arquitectura

Organizada por módulos de NestJS. Cada módulo tiene su controller, service y repository:

- **Controller:** rutas HTTP, DTOs de entrada y decoradores de permisos.
- **Service:** reglas de negocio y permisos por usuario.
- **Repository:** consultas a la base de datos (envuelve el `Repository` de TypeORM).

Los services no hacen consultas: todo acceso a datos pasa por el repository de su módulo. Si un
módulo necesita datos de otro, usa el **service** que ese módulo exporta (por ejemplo, `tasks`
usa `UsersService` para validar asignados), nunca su repository.

```
src/
├── main.ts                    # bootstrap + Swagger
├── app.module.ts              # registra módulos y guards globales
├── setup-app.ts               # ValidationPipe (compartido con los tests)
├── common/
│   ├── decorators/            # @Public, @Roles, @CurrentUser
│   ├── guards/                # RolesGuard
│   ├── transformers/          # NUMERIC de Postgres -> number
│   └── types/                 # AuthenticatedRequest
├── database/
│   ├── data-source.ts         # config de TypeORM (también la usa el CLI)
│   └── migrations/
├── modules/
│   ├── auth/                  # controller, service, JwtAuthGuard
│   ├── users/                 # entity, dto, repository, service, controller
│   ├── tasks/                 # entity, dto, repository, service, controller
│   ├── analytics/             # repository (SQL agregado), service, controller
│   └── health/                # controller, service
└── scripts/create-admin.ts
```

Los guards globales se aplican en este orden: rate limit → autenticación → roles. Las rutas
públicas se marcan con `@Public()`.

## Tests

Tests end-to-end con Jest y Supertest contra una base de datos aparte (`puul_test`, creada
automáticamente por `docker compose`):

```bash
npm test
```

## Scripts útiles

| Script | Qué hace |
|---|---|
| `npm run migration:generate` | Genera una migración a partir de los cambios en las entidades |
| `npm run migration:run` | Aplica las migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración |
| `npm run lint` / `npm run format` | Lint (ESLint) y formato (Prettier) |
