import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataGateway } from './market-data.gateway';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  controllers: [MarketDataController],
  providers: [MarketDataService, MarketDataGateway, RedisService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
