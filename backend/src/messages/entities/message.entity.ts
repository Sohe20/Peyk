import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoomEntity } from '../../rooms/entities/room.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('messages')
@Index(['roomId', 'createdAt'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  roomId!: string;

  @ManyToOne(() => RoomEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room!: RoomEntity;

  @Column('uuid')
  senderId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender!: UserEntity;

  @Column('text')
  content!: string;

  @CreateDateColumn()
  createdAt!: Date;
}