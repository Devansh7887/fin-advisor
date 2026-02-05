import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PriceAlert extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  condition: string; // 'above' | 'below' | 'drop' | 'rise'

  @Prop()
  targetPrice: number; // Required for 'above'/'below', optional for 'drop'/'rise'

  @Prop()
  percentageChange: number; // For 'drop' or 'rise' conditions

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: false })
  triggered: boolean;

  @Prop()
  triggeredAt: Date;

  @Prop()
  currentPrice: number;
}

export const PriceAlertSchema = SchemaFactory.createForClass(PriceAlert);
PriceAlertSchema.index({ userId: 1, symbol: 1, active: 1 });
