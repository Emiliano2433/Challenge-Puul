import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UserFiltersDto } from './dto/user-filters.dto';
import type { UserWithStatsDto } from './dto/user-response.dto';
import { UserRole, type User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    if (await this.usersRepository.existsByEmail(dto.email)) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }
    const { passwordHash: _omit, ...user } = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      role: dto.role ?? UserRole.MEMBER,
      passwordHash: await bcrypt.hash(dto.password, 10),
    });
    return user as User;
  }

  list(filters: UserFiltersDto): Promise<UserWithStatsDto[]> {
    return this.usersRepository.listWithStats(filters);
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  /** Incluye el hash de la contraseña; solo para validar credenciales. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  /** Devuelve los usuarios pedidos o falla si alguno no existe. */
  async findByIdsOrFail(ids: number[]): Promise<User[]> {
    const users = await this.usersRepository.findByIds(ids);
    const found = new Set(users.map((u) => u.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) {
      throw new UnprocessableEntityException(
        `Usuarios inexistentes: ${missing.join(', ')}`,
      );
    }
    return users;
  }
}
