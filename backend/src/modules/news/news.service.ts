import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NewsArticle } from './schemas/news-article.schema';
import { AIService } from '../agents/ai.service';
// import axios from 'axios'; // Not needed for now

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    @InjectModel(NewsArticle.name)
    private newsArticleModel: Model<NewsArticle>,
    private aiService: AIService,
  ) {}

  async fetchAndAnalyzeNews(symbol: string): Promise<NewsArticle[]> {
    try {
      // Fetch news from Yahoo Finance RSS or API
      const news = await this.fetchNewsFromYahoo(symbol);
      
      const analyzed = [];
      for (const article of news.slice(0, 10)) { // Analyze top 10 articles
        const sentiment = await this.analyzeSentiment(article.title + ' ' + article.summary);
        
        const newsDoc = await this.newsArticleModel.create({
          symbol,
          title: article.title,
          summary: article.summary,
          source: article.source,
          url: article.url,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          confidence: sentiment.confidence,
          keywords: sentiment.keywords,
          publishedAt: article.publishedAt,
          analyzedAt: new Date(),
        });
        
        analyzed.push(newsDoc);
      }
      
      return analyzed;
    } catch (error) {
      this.logger.error(`Failed to fetch news for ${symbol}:`, error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  private async fetchNewsFromYahoo(symbol: string): Promise<any[]> {
    try {
      // Using Yahoo Finance API (simplified version)
      // In production, use proper Yahoo Finance API or other news APIs
      const mockNews = [
        {
          title: `${symbol} Stock Surges on Strong Earnings Report`,
          summary: 'Company beats analyst expectations with record quarterly revenue.',
          source: 'Financial Times',
          url: `https://finance.yahoo.com/quote/${symbol}`,
          publishedAt: new Date(),
        },
        {
          title: `Analysts Upgrade ${symbol} Stock to Buy`,
          summary: 'Major investment banks raise price targets following positive outlook.',
          source: 'Bloomberg',
          url: `https://finance.yahoo.com/quote/${symbol}`,
          publishedAt: new Date(Date.now() - 3600000),
        },
        {
          title: `${symbol} Announces New Product Launch`,
          summary: 'Company unveils innovative product expected to drive future growth.',
          source: 'Reuters',
          url: `https://finance.yahoo.com/quote/${symbol}`,
          publishedAt: new Date(Date.now() - 7200000),
        },
      ];
      
      return mockNews;
    } catch (error) {
      this.logger.error('Failed to fetch news:', error);
      return [];
    }
  }

  private async analyzeSentiment(text: string): Promise<any> {
    const prompt = `Analyze the sentiment of the following financial news text and provide a JSON response:

Text: "${text}"

Provide analysis in this exact JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "score": -100 to +100 (negative for bearish, positive for bullish),
  "confidence": 0-100,
  "keywords": ["key", "words", "from", "text"],
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.aiService.quickChat(prompt);
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback if parsing fails
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 50,
        keywords: [],
        reasoning: 'Failed to parse AI response',
      };
    } catch (error) {
      this.logger.error('Failed to analyze sentiment:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        keywords: [],
        reasoning: 'Error analyzing sentiment',
      };
    }
  }

  async getNewsBySymbol(symbol: string, limit = 20): Promise<NewsArticle[]> {
    return this.newsArticleModel
      .find({ symbol })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();
  }

  async getNewsByPortfolio(symbols: string[]): Promise<NewsArticle[]> {
    return this.newsArticleModel
      .find({ symbol: { $in: symbols } })
      .sort({ publishedAt: -1 })
      .limit(50)
      .exec();
  }

  async getSentimentSummary(symbol: string): Promise<any> {
    const news = await this.newsArticleModel
      .find({ symbol })
      .sort({ publishedAt: -1 })
      .limit(30)
      .exec();

    if (news.length === 0) {
      return {
        symbol,
        overallSentiment: 'neutral',
        averageScore: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        recentNews: [],
      };
    }

    const bullish = news.filter(n => n.sentiment === 'bullish').length;
    const bearish = news.filter(n => n.sentiment === 'bearish').length;
    const neutral = news.filter(n => n.sentiment === 'neutral').length;
    
    const avgScore = news.reduce((sum, n) => sum + n.sentimentScore, 0) / news.length;
    
    let overallSentiment = 'neutral';
    if (avgScore > 20) overallSentiment = 'bullish';
    if (avgScore < -20) overallSentiment = 'bearish';

    return {
      symbol,
      overallSentiment,
      averageScore: Math.round(avgScore),
      bullishCount: bullish,
      bearishCount: bearish,
      neutralCount: neutral,
      recentNews: news.slice(0, 5),
    };
  }
}
