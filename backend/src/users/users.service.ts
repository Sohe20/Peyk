
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';


interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  create(data: CreateUserData): Promise<UserEntity> {
    const user = this.usersRepo.create({
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      phone: data.phone ?? null,
    });
    return this.usersRepo.save(user);
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { username } });
  }

  findByPhone(phone: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { phone } });
  }
}