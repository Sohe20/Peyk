import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../auth/jwt.strategy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from '../messages/messages.service';
import { CreateDirectDto } from './dto/create-direct.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { RoomsService } from './rooms.service';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  createGroup(@Req() req: { user: AuthUser }, @Body() dto: CreateGroupDto) {
    return this.roomsService.createGroup(req.user.id, dto.name, dto.memberIds);
  }

  @Post('direct')
  createDirect(@Req() req: { user: AuthUser }, @Body() dto: CreateDirectDto) {
    return this.roomsService.getOrCreateDirect(req.user.id, dto.userId);
  }

  @Get()
  myRooms(@Req() req: { user: AuthUser }) {
    return this.roomsService.findUserRooms(req.user.id);
  }

  @Get(':id/messages')
  async history(
    @Req() req: { user: AuthUser },
    @Param('id', ParseUUIDPipe) roomId: string,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('before') before?: string,
  ) {
    if (!(await this.roomsService.isMember(roomId, req.user.id))) {
      throw new ForbiddenException('Not a member of this room');
    }

    let beforeDate: Date | undefined;
    if (before) {
      beforeDate = new Date(before);
      if (Number.isNaN(beforeDate.getTime())) {
        throw new BadRequestException('Invalid "before" date');
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.messagesService.findHistory(roomId, safeLimit, beforeDate);
  }
}