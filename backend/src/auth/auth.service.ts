
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.usersService.findByEmail(dto.email)) {
      throw new ConflictException('Email already in use');
    }
    if (await this.usersService.findByUsername(dto.username)) {
      throw new ConflictException('Username already taken');
    }
    if (dto.phone && (await this.usersService.findByPhone(dto.phone))) {
      throw new ConflictException('Phone already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      phone: dto.phone,
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const isValid =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken };
  }
}