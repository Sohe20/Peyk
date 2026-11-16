import { Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../auth/jwt.strategy';
import { MessagesService } from '../messages/messages.service';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';

const roomName = (roomId: string) => `room:${roomId}`;

// ValidationPipe برای سوکت: خطاها رو به WsException تبدیل می‌کنه
const wsValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  exceptionFactory: (errors) =>
    new WsException(errors.flatMap((e) => Object.values(e.constraints ?? {}))),
});

@UsePipes(wsValidationPipe)
@WebSocketGateway({
  cors: { origin: ['http://localhost:4200'], credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token: unknown = socket.handshake.auth?.token;
        if (typeof token !== 'string' || !token) {
          throw new Error('Missing token');
        }

        const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
        const user = await this.usersService.findById(payload.sub);
        if (!user) {
          throw new Error('User not found');
        }

        const authUser: AuthUser = {
          id: user.id,
          username: user.username,
          email: user.email,
        };
        socket.data.user = authUser;

        // کاربر خودکار وارد اتاق همه‌ی روم‌هاش می‌شه
        const rooms = await this.roomsService.findUserRooms(user.id);
        if (rooms.length > 0) {
          await socket.join(rooms.map((r) => roomName(r.id)));
        }

        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    const user = client.data.user as AuthUser;
    this.logger.log(`Connected: ${user.username} (${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthUser | undefined;
    this.logger.log(`Disconnected: ${user?.username ?? 'unknown'} (${client.id})`);
  }

  private getUser(client: Socket): AuthUser {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      throw new WsException('Unauthorized');
    }
    return user;
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const user = this.getUser(client);
    return { pong: true, userId: user.id };
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    const user = this.getUser(client);
    if (!(await this.roomsService.isMember(dto.roomId, user.id))) {
      throw new WsException('Not a member of this room');
    }
    await client.join(roomName(dto.roomId));
    return { joined: true, roomId: dto.roomId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const user = this.getUser(client);
    if (!(await this.roomsService.isMember(dto.roomId, user.id))) {
      throw new WsException('Not a member of this room');
    }

    const message = await this.messagesService.create(
      dto.roomId,
      user.id,
      dto.content,
    );

    const payload = {
      id: message.id,
      roomId: message.roomId,
      content: message.content,
      createdAt: message.createdAt,
      sender: { id: user.id, username: user.username },
    };

    this.server.to(roomName(dto.roomId)).emit('newMessage', payload);
    return payload; // acknowledgement برای فرستنده
  }
}