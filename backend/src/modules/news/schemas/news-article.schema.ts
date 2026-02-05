import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class NewsArticle extends Document {
  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  summary: string;

  @Prop()
  source: string;

  @Prop()
  url: string;

  @Prop({ required: true })
  sentiment: string; // 'bullish' | 'bearish' | 'neutral'

  @Prop({ required: true })
  sentimentScore: number; // -100 to +100

  @Prop()
  confidence: number; // 0-100

  @Prop()
  keywords: string[];

  @Prop()
  publishedAt: Date;

  @Prop()
  analyzedAt: Date;
}

export const NewsArticleSchema = SchemaFactory.createForClass(NewsArticle);
NewsArticleSchema.index({ symbol: 1, publishedAt: -1 });
