

import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../auth/jwt.strategy';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: { origin: ['http://localhost:4200'], credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  // یک بار موقع بالا اومدن Gateway اجرا می‌شه
  afterInit(server: Server) {
    // middleware: برای هر اتصال جدید قبل از کامل شدن اتصال اجرا می‌شه
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
        next(); // اتصال قبول شد
      } catch {
        next(new Error('Unauthorized')); // اتصال رد شد
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

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      throw new WsException('Unauthorized');
    }
    return { pong: true, userId: user.id };
  }
}