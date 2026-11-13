import { ConflictException, Injectable } from '@nestjs/common';
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
}
