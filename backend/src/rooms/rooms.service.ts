import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { MemberRole, RoomMemberEntity } from './entities/room-member.entity';
import { RoomEntity, RoomType } from './entities/room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomsRepo: Repository<RoomEntity>,
    @InjectRepository(RoomMemberEntity)
    private readonly membersRepo: Repository<RoomMemberEntity>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async createGroup(ownerId: string, name: string, memberIds: string[]) {
    // تکراری‌ها و خود سازنده رو حذف کن
    const others = [...new Set(memberIds)].filter((id) => id !== ownerId);

    for (const id of others) {
      if (!(await this.usersService.findById(id))) {
        throw new NotFoundException(`User ${id} not found`);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const room = await manager.save(
        manager.create(RoomEntity, {
          name,
          type: RoomType.GROUP,
          directKey: null,
        }),
      );

      const members = [
        manager.create(RoomMemberEntity, {
          roomId: room.id,
          userId: ownerId,
          role: MemberRole.OWNER,
        }),
        ...others.map((userId) =>
          manager.create(RoomMemberEntity, {
            roomId: room.id,
            userId,
            role: MemberRole.MEMBER,
          }),
        ),
      ];
      await manager.save(members);
      return room;
    });
  }

  async getOrCreateDirect(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot create a chat with yourself');
    }
    if (!(await this.usersService.findById(otherUserId))) {
      throw new NotFoundException('User not found');
    }

    // مرتب‌سازی باعث می‌شه (A,B) و (B,A) یک کلید بدن
    const directKey = [userId, otherUserId].sort().join(':');

    const existing = await this.roomsRepo.findOne({ where: { directKey } });
    if (existing) return existing;

    try {
      return await this.dataSource.transaction(async (manager) => {
        const room = await manager.save(
          manager.create(RoomEntity, {
            name: null,
            type: RoomType.DIRECT,
            directKey,
          }),
        );
        await manager.save([
          manager.create(RoomMemberEntity, {
            roomId: room.id,
            userId,
            role: MemberRole.MEMBER,
          }),
          manager.create(RoomMemberEntity, {
            roomId: room.id,
            userId: otherUserId,
            role: MemberRole.MEMBER,
          }),
        ]);
        return room;
      });
    } catch (err) {
      // دو درخواست همزمان: دیگری زودتر ساخته (نقض unique روی directKey)
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string }).code === '23505'
      ) {
        const room = await this.roomsRepo.findOne({ where: { directKey } });
        if (room) return room;
      }
      throw err;
    }
  }

  isMember(roomId: string, userId: string): Promise<boolean> {
    return this.membersRepo.existsBy({ roomId, userId });
  }

  async findUserRooms(userId: string): Promise<RoomEntity[]> {
    const memberships = await this.membersRepo.find({
      where: { userId },
      relations: { room: true },
      order: { joinedAt: 'DESC' },
    });
    return memberships.map((m) => m.room);
  }
}