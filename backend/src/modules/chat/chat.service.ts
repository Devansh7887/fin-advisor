import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from './schemas/conversation.schema';
import { AIService } from '../agents/ai.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    private aiService: AIService,
  ) {}

  async createConversation(userId: string, title?: string): Promise<Conversation> {
    const conversation = new this.conversationModel({
      userId,
      title: title || 'New Conversation',
      messages: [],
      isActive: true,
    });
    return conversation.save();
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return this.conversationModel
      .find({ userId, isActive: true })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(50)
      .exec();
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationModel
      .findOne({ _id: conversationId, userId })
      .exec();
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async addMessage(
    conversationId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId, userId);
    
    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
    } as any);
    
    conversation.lastMessageAt = new Date();
    return conversation.save();
  }

  async chat(
    conversationId: string,
    userId: string,
    message: string,
    context?: any,
  ): Promise<string> {
    // Add user message
    const conversation = await this.addMessage(conversationId, userId, 'user', message);

    // Get conversation history (last 3 messages for context to save tokens)
    // Reduced from 10 to 3 to minimize API costs and quota usage
    const recentMessages = conversation.messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get AI response
    const response = await this.aiService.quickChat(message, recentMessages);

    // Add assistant message
    await this.addMessage(conversationId, userId, 'assistant', response);

    return response;
  }

  async getFinancialAdvice(
    conversationId: string,
    userId: string,
    message: string,
    context?: {
      portfolio?: any;
      userProfile?: any;
      marketData?: any;
    },
  ): Promise<string> {
    // Add user message
    await this.addMessage(conversationId, userId, 'user', message);

    // Get AI advice with context
    const advice = await this.aiService.getFinancialAdvice(message, context);

    // Add assistant message
    await this.addMessage(conversationId, userId, 'assistant', advice);

    return advice;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);
    conversation.isActive = false;
    await conversation.save();
  }

  async generateConversationTitle(messages: any[]): Promise<string> {
    if (messages.length === 0) return 'New Conversation';
    
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Conversation';
    
    // Take first 50 characters of first message as title
    const title = firstUserMessage.content.substring(0, 50);
    return title.length < firstUserMessage.content.length ? `${title}...` : title;
  }
}
