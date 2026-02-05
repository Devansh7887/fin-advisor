import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Decimal from 'decimal.js';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.cacheEnabled = this.configService.get<boolean>('marketData.enableCache');
    this.cacheTTL = this.configService.get<number>('marketData.cacheTTL');
    this.logger.log('✅ Market Data Service initialized (Mock Mode)');
  }

  /**
   * Get real-time quote for a symbol (Mock Data)
   */
  async getQuote(symbol: string): Promise<any> {
    this.logger.debug(`Fetching quote for ${symbol}`);
    
    // Return mock data for now
    const mockPrice = 100 + Math.random() * 100;
    const mockChange = -5 + Math.random() * 10;
    
    return {
      symbol: symbol.toUpperCase(),
      name: `${symbol} Inc.`,
      price: mockPrice,
      change: mockChange,
      changePercent: (mockChange / mockPrice) * 100,
      volume: Math.floor(Math.random() * 10000000),
      marketCap: mockPrice * 1000000000,
      open: mockPrice - 2,
      high: mockPrice + 5,
      low: mockPrice - 5,
      previousClose: mockPrice - mockChange,
      fiftyTwoWeekHigh: mockPrice * 1.5,
      fiftyTwoWeekLow: mockPrice * 0.5,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get historical data for a symbol (Mock Data)
   */
  async getHistoricalData(
    symbol: string,
    period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' = '1mo',
  ): Promise<any[]> {
    this.logger.debug(`Fetching historical data for ${symbol} (${period})`);
    
    const days = period === '1d' ? 1 : period === '5d' ? 5 : period === '1mo' ? 30 : 90;
    const data = [];
    let basePrice = 100;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      basePrice = basePrice + (Math.random() - 0.5) * 5;
      
      data.push({
        date: date.toISOString(),
        open: basePrice,
        high: basePrice + Math.random() * 3,
        low: basePrice - Math.random() * 3,
        close: basePrice + (Math.random() - 0.5) * 2,
        volume: Math.floor(Math.random() * 5000000),
      });
    }
    
    return data;
  }

  /**
   * Search for symbols (Mock Data)
   */
  async searchSymbols(query: string): Promise<any[]> {
    this.logger.debug(`Searching for ${query}`);
    
    const mockResults = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'EQUITY', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'EQUITY', exchange: 'NASDAQ' },
    ];
    
    return mockResults.filter(r => 
      r.symbol.includes(query.toUpperCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Get multiple quotes at once
   */
  async getQuotesMultiple(symbols: string[]): Promise<any[]> {
    const quotes = await Promise.all(
      symbols.map(symbol => this.getQuote(symbol))
    );
    return quotes;
  }

  /**
   * Get company profile/info (Mock Data)
   */
  async getCompanyInfo(symbol: string): Promise<any> {
    this.logger.debug(`Fetching company info for ${symbol}`);
    
    return {
      symbol: symbol.toUpperCase(),
      name: `${symbol} Company Description`,
      sector: 'Technology',
      industry: 'Software',
      website: `https://www.${symbol.toLowerCase()}.com`,
      employees: 150000,
      marketCap: 2000000000000,
      revenue: 400000000000,
      profitMargins: 0.25,
      peRatio: 28.5,
      dividendYield: 0.005,
    };
  }

  /**
   * Calculate technical indicators (Mock Data)
   */
  async getTechnicalIndicators(symbol: string, period: string = '1mo'): Promise<any> {
    this.logger.debug(`Calculating technical indicators for ${symbol}`);
    
    const currentPrice = 150 + Math.random() * 50;
    const sma20 = currentPrice * (0.98 + Math.random() * 0.04);
    const rsi = 30 + Math.random() * 40;
    
    return {
      symbol,
      indicators: {
        sma20: sma20.toFixed(2),
        sma50: (sma20 * 1.02).toFixed(2),
        rsi: rsi.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
      },
      interpretation: this.interpretIndicators(currentPrice, sma20, rsi),
    };
  }

  // Helper methods
  private interpretIndicators(price: number, sma20: number, rsi: number): string {
    const signals: string[] = [];

    if (price > sma20) {
      signals.push('Price above 20-day SMA (bullish)');
    } else {
      signals.push('Price below 20-day SMA (bearish)');
    }

    if (rsi > 70) {
      signals.push('RSI indicates overbought');
    } else if (rsi < 30) {
      signals.push('RSI indicates oversold');
    } else {
      signals.push('RSI in neutral zone');
    }

    return signals.join('. ');
  }
}
