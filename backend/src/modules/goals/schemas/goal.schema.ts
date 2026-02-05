import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

class Milestone {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  targetAmount: number;

  @Prop({ default: false })
  achieved: boolean;
}

class AllocationSuggestion {
  @Prop()
  assetClass: string; // 'stocks', 'bonds', 'cash', 'crypto'

  @Prop()
  percentage: number;

  @Prop()
  reasoning: string;
}

@Schema({ timestamps: true })
export class Goal extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  name: string; // e.g., "House Down Payment", "Retirement"

  @Prop()
  description: string;

  @Prop({ required: true })
  targetAmount: number;

  @Prop({ default: 0 })
  currentAmount: number;

  @Prop({ required: true })
  targetDate: Date;

  @Prop()
  portfolioId: string; // Linked portfolio

  @Prop({ default: 'active' })
  status: string; // 'active' | 'achieved' | 'paused'

  @Prop()
  riskTolerance: string; // 'conservative' | 'moderate' | 'aggressive'

  @Prop()
  monthlyContribution: number;

  @Prop({ type: [Milestone] })
  milestones: Milestone[];

  @Prop({ type: [AllocationSuggestion] })
  suggestedAllocation: AllocationSuggestion[];

  @Prop()
  aiRecommendations: string;

  @Prop()
  progress: number; // 0-100 percentage

  @Prop()
  onTrack: boolean;
}

export const GoalSchema = SchemaFactory.createForClass(Goal);
