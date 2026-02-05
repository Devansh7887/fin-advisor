import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GoalsService } from "./goals.service";

@Controller("goals")
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  async createGoal(@Body() goalData: any, @Request() req) {
    return this.goalsService.createGoal(req.user.userId, goalData);
  }

  @Get()
  async getGoals(@Request() req) {
    return this.goalsService.getGoals(req.user.userId);
  }

  @Get(":id")
  async getGoal(@Param("id") id: string, @Request() req) {
    return this.goalsService.getGoal(id, req.user.userId);
  }

  @Put(":id")
  async updateGoal(
    @Param("id") id: string,
    @Body() updates: any,
    @Request() req,
  ) {
    return this.goalsService.updateGoal(id, req.user.userId, updates);
  }

  @Delete(":id")
  async deleteGoal(@Param("id") id: string, @Request() req) {
    await this.goalsService.deleteGoal(id, req.user.userId);
    return { message: "Goal deleted successfully" };
  }

  @Get(":id/insights")
  async getGoalInsights(@Param("id") id: string, @Request() req) {
    return this.goalsService.getGoalInsights(id, req.user.userId);
  }

  @Post(":id/contribution")
  async addContribution(
    @Param("id") id: string,
    @Body() data: { amount: number },
    @Request() req,
  ) {
    return this.goalsService.addContribution(id, req.user.userId, data.amount);
  }

  @Post(":id/sync-portfolio-profit")
  async syncPortfolioProfit(@Param("id") id: string, @Request() req) {
    return this.goalsService.syncPortfolioProfit(id, req.user.userId);
  }
}
