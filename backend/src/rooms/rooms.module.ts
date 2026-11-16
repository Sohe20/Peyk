import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomMemberEntity } from './entities/room-member.entity';
import { RoomEntity } from './entities/room.entity';

@Module({
  imports:[TypeOrmModule.forFeature([RoomEntity, RoomMemberEntity])],
  providers: [RoomsService]
})
export class RoomsModule {}
