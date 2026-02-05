import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

class Holding {
  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true, type: String })
  avgCost: string; // Stored as string to preserve precision

  @Prop({ type: String })
  currentPrice?: string;

  @Prop({ type: String })
  totalValue?: string;

  @Prop({ type: String })
  gainLoss?: string;

  @Prop({ type: Number })
  gainLossPercentage?: number;

  @Prop()
  lastUpdated?: Date;

  @Prop()
  assetType?: string; // stock, crypto, bond, etc.
}

@Schema({ timestamps: true })
export class Portfolio extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Object], default: [] })
  holdings: Holding[];

  @Prop({ type: String, default: '0' })
  totalValue: string;

  @Prop({ type: String, default: '0' })
  totalCost: string;

  @Prop({ type: String, default: '0' })
  totalGainLoss: string;

  @Prop({ type: Number, default: 0 })
  totalGainLossPercent: number;

  @Prop()
  lastAnalyzedAt?: Date;

  @Prop({ type: Object })
  aiInsights?: {
    analysis?: string;
    recommendations?: string[];
    riskScore?: number;
    lastUpdated?: Date;
  };
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
