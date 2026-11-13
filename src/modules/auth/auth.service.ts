import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { LoginDto, TokenResponseDto } from './dto/login.dto';

interface JwtPayload {
  sub: number;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    const payload: JwtPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, tokenType: 'Bearer' };
  }

  /** Valida el token y devuelve el usuario actual (con su rol vigente). */
  async validateToken(token: string): Promise<User> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o ausente');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Token inválido o ausente');
    return user;
  }
}
