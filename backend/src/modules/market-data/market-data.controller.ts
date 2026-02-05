import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('market-data')
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    return this.marketDataService.getQuote(symbol.toUpperCase());
  }

  @Get('historical/:symbol')
  async getHistoricalData(
    @Param('symbol') symbol: string,
    @Query('period') period?: string,
  ) {
    return this.marketDataService.getHistoricalData(
      symbol.toUpperCase(),
      period as any,
    );
  }

  @Get('search')
  async searchSymbols(@Query('q') query: string) {
    return this.marketDataService.searchSymbols(query);
  }

  @Get('batch')
  async getBatchQuotes(@Query('symbols') symbols: string) {
    const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
    return this.marketDataService.getQuotesMultiple(symbolArray);
  }

  @Get('info/:symbol')
  async getCompanyInfo(@Param('symbol') symbol: string) {
    return this.marketDataService.getCompanyInfo(symbol.toUpperCase());
  }

  @Get('indicators/:symbol')
  async getTechnicalIndicators(
    @Param('symbol') symbol: string,
    @Query('period') period?: string,
  ) {
    return this.marketDataService.getTechnicalIndicators(
      symbol.toUpperCase(),
      period,
    );
  }
}
