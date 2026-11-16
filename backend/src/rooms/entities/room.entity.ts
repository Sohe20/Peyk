import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum RoomType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Entity('rooms')
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // چت یک‌به‌یک اسم نداره، پس nullable
  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'enum', enum: RoomType })
  type!: RoomType;

  // فقط برای روم direct: شناسه‌ی دو کاربر (مرتب‌شده) با ":" بینشون
  @Column({ type: 'varchar', unique: true, nullable: true })
  directKey!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}