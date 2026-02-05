import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AIService } from '../agents/ai.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
  pingTimeout: 60000, // 60 seconds - prevents timeout during long AI responses
  pingInterval: 25000, // 25 seconds - keep connection alive
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private aiService: AIService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      message: string;
      userId: string;
    },
  ) {
    const { conversationId, message, userId } = data;
    this.logger.log(`Received message for conversation ${conversationId} from user ${userId}`);

    try {
      // Validate conversation exists and add user message
      const conversation = await this.chatService.getConversation(conversationId, userId);
      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      await this.chatService.addMessage(conversationId, userId, 'user', message);

      // Emit user message immediately
      client.emit('chat:message:user', {
        conversationId,
        message,
        timestamp: new Date(),
      });

      // Get UPDATED conversation history after adding the user message
      // Limit to last 6 messages (3 exchanges) to reduce token usage
      const updatedConversation = await this.chatService.getConversation(conversationId, userId);
      const recentMessages = updatedConversation.messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Stream AI response
      let fullResponse = '';
      
      try {
        const stream = await this.aiService.streamChat(message, recentMessages);

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            // Emit each chunk to the client
            client.emit('chat:message:stream', {
              conversationId,
              chunk: content,
            });
          }
        }
      } catch (aiError) {
        this.logger.error('AI Service Error:', aiError.message || aiError);
        
        // Provide fallback response if AI fails
        if (!fullResponse) {
          fullResponse = "I apologize, but I'm experiencing technical difficulties at the moment. I'm an AI financial advisor designed to help you with:\n\n" +
            "- Portfolio analysis and recommendations\n" +
            "- Investment strategies\n" +
            "- Market insights\n" +
            "- Risk management\n\n" +
            "Please try your question again, or contact support if the issue persists.";
        }
      }

      // Save complete response
      await this.chatService.addMessage(
        conversationId,
        userId,
        'assistant',
        fullResponse,
      );

      // Emit completion
      client.emit('chat:message:complete', {
        conversationId,
        message: fullResponse,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error handling chat message', error.stack || error);
      client.emit('chat:error', {
        conversationId,
        error: error.message || 'Failed to process message',
      });
      client.emit('chat:message:complete', {
        conversationId,
        message: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    // Broadcast typing indicator to other clients in the conversation
    client.broadcast.emit('chat:typing', data);
  }
}
