import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NewsService } from './news.service';

@Controller('news')
@UseGuards(JwtAuthGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post('analyze/:symbol')
  async analyzeNews(@Param('symbol') symbol: string) {
    return this.newsService.fetchAndAnalyzeNews(symbol);
  }

  @Get('symbol/:symbol')
  async getNewsBySymbol(@Param('symbol') symbol: string) {
    return this.newsService.getNewsBySymbol(symbol);
  }

  @Post('portfolio')
  async getNewsByPortfolio(@Body() body: { symbols: string[] }) {
    return this.newsService.getNewsByPortfolio(body.symbols);
  }

  @Get('sentiment/:symbol')
  async getSentimentSummary(@Param('symbol') symbol: string) {
    return this.newsService.getSentimentSummary(symbol);
  }
}
