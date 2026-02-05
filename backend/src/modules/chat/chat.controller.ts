import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@Req() req) {
    return this.chatService.getConversations(req.user.userId);
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Req() req) {
    return this.chatService.getConversation(id, req.user.userId);
  }

  @Post('conversations')
  async createConversation(@Body() body: { title?: string }, @Req() req) {
    return this.chatService.createConversation(req.user.userId, body.title);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { message: string; type?: 'quick' | 'advice' },
    @Req() req,
  ) {
    const { message, type = 'quick' } = body;

    if (type === 'advice') {
      const response = await this.chatService.getFinancialAdvice(
        id,
        req.user.userId,
        message,
      );
      return { response };
    } else {
      const response = await this.chatService.chat(id, req.user.userId, message);
      return { response };
    }
  }

  @Delete('conversations/:id')
  async deleteConversation(@Param('id') id: string, @Req() req) {
    await this.chatService.deleteConversation(id, req.user.userId);
    return { success: true };
  }
}
