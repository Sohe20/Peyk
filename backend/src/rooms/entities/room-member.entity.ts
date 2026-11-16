/* eslint-disable  */
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { RoomEntity } from './room.entity';

export enum MemberRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

@Entity('room_members')
export class RoomMemberEntity {
  // کلید ترکیبی: یک کاربر فقط یک بار می‌تونه عضو یک روم باشه
  @PrimaryColumn('uuid')
  roomId!: string;

  @PrimaryColumn('uuid')
  userId!: string;

  @ManyToOne(() => RoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room!: RoomEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role!: MemberRole;

  // آخرین زمانی که کاربر این روم رو خونده (برای unread و read receipt)
  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt!: Date | null;

  @CreateDateColumn()
  joinedAt!: Date;
}