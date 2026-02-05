import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ChartPatternsController } from "./chart-patterns.controller";
import { ChartPatternsService } from "./chart-patterns.service";
import {
  PatternAlert,
  PatternAlertSchema,
} from "./schemas/pattern-alert.schema";
import { AgentsModule } from "../agents/agents.module";
import { MarketDataModule } from "../market-data/market-data.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatternAlert.name, schema: PatternAlertSchema },
    ]),
    AgentsModule,
    MarketDataModule,
  ],
  controllers: [ChartPatternsController],
  providers: [ChartPatternsService],
  exports: [ChartPatternsService],
})
export class ChartPatternsModule {}
