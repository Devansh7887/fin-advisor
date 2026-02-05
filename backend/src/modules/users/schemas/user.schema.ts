import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ 
    type: String, 
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate' 
  })
  riskTolerance: string;

  @Prop({ type: [String], default: [] })
  investmentGoals: string[];

  @Prop({ type: Object, default: {} })
  financialSituation: {
    annualIncome?: number;
    netWorth?: number;
    investmentExperience?: string;
  };

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
