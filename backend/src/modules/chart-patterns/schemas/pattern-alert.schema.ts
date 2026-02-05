import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PatternAlert extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  pattern: string; // e.g., 'Head and Shoulders', 'Cup and Handle'

  @Prop({ required: true })
  confidence: number; // 0-100

  @Prop({ required: true })
  signal: string; // 'bullish' | 'bearish' | 'neutral'

  @Prop()
  description: string;

  @Prop()
  targetPrice: number;

  @Prop()
  stopLoss: number;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  detectedAt: Date;
}

export const PatternAlertSchema = SchemaFactory.createForClass(PatternAlert);
