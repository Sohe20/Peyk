
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { MessageEntity } from './entities/message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messagesRepo: Repository<MessageEntity>,
  ) {}

  create(
    roomId: string,
    senderId: string,
    content: string,
  ): Promise<MessageEntity> {
    const message = this.messagesRepo.create({ roomId, senderId, content });
    return this.messagesRepo.save(message);
  }

  // جدیدترین‌ها اول. با before (زمان قدیمی‌ترین پیامی که دیدی) صفحه‌ی بعدی رو می‌گیری
  findHistory(
    roomId: string,
    limit = 30,
    before?: Date,
  ): Promise<MessageEntity[]> {
    return this.messagesRepo.find({
      where: { roomId, ...(before ? { createdAt: LessThan(before) } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}