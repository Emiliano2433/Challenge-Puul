import 'dotenv/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { Task } from '../modules/tasks/entities/task.entity';
import { User } from '../modules/users/entities/user.entity';

export function buildDataSourceOptions(
  url = process.env.DATABASE_URL,
): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [User, Task],
    // el CLI corre sobre dist/, donde las migraciones ya son .js
    migrations: [__dirname + '/migrations/*.js'],
    synchronize: false,
  };
}

/** Usado por el CLI de TypeORM para generar y correr migraciones. */
export default new DataSource(buildDataSourceOptions());
