import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true })
    username: string

    @Column({ unique: true })
    email: string

    @Column({ type: 'varchar', unique: true, nullable: true })
    phone: string | null

    @Column()
    passwordHash: string

    @CreateDateColumn()
    createdAt: Date
}