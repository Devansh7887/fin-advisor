import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { GoalsController } from "./goals.controller";
import { GoalsService } from "./goals.service";
import { Goal, GoalSchema } from "./schemas/goal.schema";
import { AgentsModule } from "../agents/agents.module";
import { PortfolioModule } from "../portfolio/portfolio.module";
import { MarketDataModule } from "../market-data/market-data.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Goal.name, schema: GoalSchema }]),
    AgentsModule,
    PortfolioModule,
    MarketDataModule,
  ],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
