import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PatternAlert } from "./schemas/pattern-alert.schema";
import { AIService } from "../agents/ai.service";
import { MarketDataService } from "../market-data/market-data.service";

@Injectable()
export class ChartPatternsService {
  private readonly logger = new Logger(ChartPatternsService.name);

  constructor(
    @InjectModel(PatternAlert.name)
    private patternAlertModel: Model<PatternAlert>,
    private aiService: AIService,
    private marketDataService: MarketDataService,
  ) {}

  async analyzePattern(symbol: string, userId: string): Promise<any> {
    try {
      // Get historical data for the symbol
      const historical = await this.marketDataService.getHistoricalData(
        symbol,
        "6mo",
      );

      // Prepare data for AI analysis
      const priceData = historical.map((h) => ({
        date: h.date,
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
        volume: h.volume,
      }));

      const prompt = `You are an expert technical analyst. Analyze the following ${priceData.length} days of stock price data for ${symbol} and identify ANY chart patterns, even if they're forming or partial.

Price Data (most recent 60 days):
${JSON.stringify(priceData.slice(-60), null, 2)}

Look for these patterns:
- Head and Shoulders (bearish reversal)
- Inverse Head and Shoulders (bullish reversal)
- Cup and Handle (bullish continuation)
- Double Top/Bottom (reversal patterns)
- Ascending/Descending Triangles (consolidation)
- Flags and Pennants (continuation)
- Support/Resistance levels
- Trend lines and channels
- Breakouts or breakdowns

IMPORTANT: 
- Detect patterns even if they're partially formed (give lower confidence)
- Analyze recent price trends and momentum
- Always find at least 1-2 patterns or trends
- If no classic patterns, describe the trend (uptrend, downtrend, sideways)

Provide your analysis as ONLY a JSON object (no markdown, no explanation):
{
  "patterns": [
    {
      "name": "Pattern Name",
      "confidence": 0-100,
      "signal": "bullish" | "bearish" | "neutral",
      "description": "Detailed description of what you see",
      "targetPrice": estimated_target_price_as_number,
      "stopLoss": suggested_stop_loss_as_number
    }
  ]
}`;

      const analysis = await this.aiService.quickChat(prompt);

      // Parse AI response
      let patterns;
      try {
        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          patterns = JSON.parse(jsonMatch[0]);
        } else {
          patterns = { patterns: [] };
        }
      } catch (e) {
        this.logger.warn("Failed to parse AI response as JSON");
        patterns = { patterns: [] };
      }

      // Save detected patterns as alerts
      this.logger.log(
        `AI detected ${patterns.patterns?.length || 0} patterns for ${symbol}`,
      );

      for (const pattern of patterns.patterns || []) {
        this.logger.log(
          `Pattern: ${pattern.name} (${pattern.confidence}% confidence, ${pattern.signal})`,
        );

        if (pattern.confidence > 30) {
          // Save patterns with >30% confidence
          await this.patternAlertModel.create({
            userId,
            symbol,
            pattern: pattern.name,
            confidence: pattern.confidence,
            signal: pattern.signal,
            description: pattern.description,
            targetPrice: pattern.targetPrice,
            stopLoss: pattern.stopLoss,
            detectedAt: new Date(),
          });
          this.logger.log(
            `✅ Saved pattern alert: ${pattern.name} for ${symbol}`,
          );
        } else {
          this.logger.log(
            `⚠️ Skipped low-confidence pattern: ${pattern.name} (${pattern.confidence}%)`,
          );
        }
      }

      // If AI didn't detect any patterns, create a basic trend analysis
      if (!patterns.patterns || patterns.patterns.length === 0) {
        this.logger.warn(
          `No patterns detected by AI for ${symbol}, creating fallback trend analysis`,
        );

        // Analyze basic trend from price data
        const recentPrices = priceData.slice(-20).map((p) => p.close);
        const firstPrice = recentPrices[0];
        const lastPrice = recentPrices[recentPrices.length - 1];
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

        let trendName, signal, description;
        if (priceChange > 3) {
          trendName = "Uptrend";
          signal = "bullish";
          description = `Stock showing upward momentum with ${priceChange.toFixed(1)}% gain over recent period`;
        } else if (priceChange < -3) {
          trendName = "Downtrend";
          signal = "bearish";
          description = `Stock in downward trend with ${Math.abs(priceChange).toFixed(1)}% decline over recent period`;
        } else {
          trendName = "Sideways Movement";
          signal = "neutral";
          description = `Stock trading in a range with ${priceChange.toFixed(1)}% change, no clear trend`;
        }

        // Save the fallback pattern
        await this.patternAlertModel.create({
          userId,
          symbol,
          pattern: trendName,
          confidence: 50, // Medium confidence for basic trend analysis
          signal: signal as any,
          description,
          targetPrice:
            lastPrice *
            (signal === "bullish" ? 1.05 : signal === "bearish" ? 0.95 : 1.02),
          stopLoss:
            lastPrice *
            (signal === "bullish" ? 0.95 : signal === "bearish" ? 1.05 : 0.98),
          detectedAt: new Date(),
        });
        this.logger.log(
          `✅ Saved fallback trend analysis for ${symbol}: ${trendName}`,
        );
      }

      return {
        symbol,
        patterns: patterns.patterns || [],
        analysis,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze patterns for ${symbol}:`, error);
      // Return empty patterns instead of throwing error
      return {
        symbol,
        patterns: [],
        analysis: "Failed to analyze chart patterns. Please try again later.",
        error: error.message,
      };
    }
  }

  async getAlerts(userId: string): Promise<PatternAlert[]> {
    return this.patternAlertModel
      .find({ userId })
      .sort({ detectedAt: -1 })
      .limit(50)
      .exec();
  }

  async markAsRead(alertId: string, userId: string): Promise<PatternAlert> {
    return this.patternAlertModel
      .findOneAndUpdate(
        { _id: alertId, userId },
        { isRead: true },
        { new: true },
      )
      .exec();
  }

  async deleteAlert(alertId: string, userId: string): Promise<void> {
    await this.patternAlertModel.deleteOne({ _id: alertId, userId }).exec();
  }
}
