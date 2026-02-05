import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  type: string; // 'price_alert' | 'pattern_detected' | 'news_sentiment' | 'goal_milestone' | 'dividend' | 'earnings'

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  symbol: string;

  @Prop()
  priority: string; // 'low' | 'medium' | 'high' | 'urgent'

  @Prop({ default: false })
  read: boolean;

  @Prop()
  actionUrl: string;

  @Prop({ type: Object })
  metadata: any; // Additional context data
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
