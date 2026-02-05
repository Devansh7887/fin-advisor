import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AIService],
  exports: [AIService],
})
export class AgentsModule {}
