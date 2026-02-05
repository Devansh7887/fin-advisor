import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ChartPatternsService } from "./chart-patterns.service";

@Controller("chart-patterns")
@UseGuards(JwtAuthGuard)
export class ChartPatternsController {
  constructor(private readonly chartPatternsService: ChartPatternsService) {}

  @Post("analyze/:symbol")
  async analyzePattern(@Param("symbol") symbol: string, @Request() req) {
    return this.chartPatternsService.analyzePattern(symbol, req.user.userId);
  }

  @Get("alerts")
  async getAlerts(@Request() req) {
    return this.chartPatternsService.getAlerts(req.user.userId);
  }

  @Post("alerts/:id/read")
  async markAsRead(@Param("id") id: string, @Request() req) {
    return this.chartPatternsService.markAsRead(id, req.user.userId);
  }

  @Delete("alerts/:id")
  async deleteAlert(@Param("id") id: string, @Request() req) {
    await this.chartPatternsService.deleteAlert(id, req.user.userId);
    return { message: "Alert deleted successfully" };
  }
}
