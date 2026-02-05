import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("portfolios")
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async getAllPortfolios(@Req() req) {
    console.log("📋 GET /portfolios - User:", req.user.userId);
    return this.portfolioService.findAllByUser(req.user.userId);
  }

  @Get(":id")
  async getPortfolio(@Param("id") id: string, @Req() req) {
    return this.portfolioService.findById(id, req.user.userId);
  }

  @Post()
  async createPortfolio(@Body() body: { name: string }, @Req() req) {
    console.log(
      "✨ POST /portfolios - User:",
      req.user.userId,
      "Name:",
      body.name,
    );
    const result = await this.portfolioService.create(
      req.user.userId,
      body.name,
    );
    console.log("✅ Portfolio created:", result);
    return result;
  }

  @Post(":id/holdings")
  async addHolding(@Param("id") id: string, @Body() holding: any, @Req() req) {
    return this.portfolioService.addHolding(id, req.user.userId, holding);
  }

  @Delete(":id/holdings/:symbol")
  async removeHolding(
    @Param("id") id: string,
    @Param("symbol") symbol: string,
    @Req() req,
  ) {
    return this.portfolioService.removeHolding(id, req.user.userId, symbol);
  }

  @Get(":id/analysis")
  async getAIAnalysis(@Param("id") id: string, @Req() req) {
    // In a real app, you'd fetch the user profile here
    const userProfile = { riskTolerance: "moderate", investmentGoals: [] };
    return this.portfolioService.getAIAnalysis(
      id,
      req.user.userId,
      userProfile,
    );
  }

  @Get(":id/metrics")
  async getMetrics(@Param("id") id: string, @Req() req) {
    return this.portfolioService.getPerformanceMetrics(id, req.user.userId);
  }
}
