import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Portfolio } from "./schemas/portfolio.schema";
import Decimal from "decimal.js";
import { AIService } from "../agents/ai.service";
import { MarketDataService } from "../market-data/market-data.service";

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
    private aiService: AIService,
    private marketDataService: MarketDataService,
  ) {}

  async create(userId: string, name: string): Promise<Portfolio> {
    const portfolio = new this.portfolioModel({
      userId,
      name,
      holdings: [],
      totalValue: "0",
      totalCost: "0",
      totalGainLoss: "0",
      totalGainLossPercent: 0,
    });
    return portfolio.save();
  }

  async findAllByUser(userId: string): Promise<Portfolio[]> {
    return this.portfolioModel.find({ userId }).exec();
  }

  async findById(portfolioId: string, userId: string): Promise<Portfolio> {
    const portfolio = await this.portfolioModel
      .findOne({ _id: portfolioId, userId })
      .exec();

    if (!portfolio) {
      throw new NotFoundException("Portfolio not found");
    }
    return portfolio;
  }

  async addHolding(
    portfolioId: string,
    userId: string,
    holding: {
      symbol: string;
      quantity: number;
      avgCost: number;
      assetType?: string;
    },
  ): Promise<Portfolio> {
    const portfolio = await this.findById(portfolioId, userId);

    // Check if holding already exists
    const existingHoldingIndex = portfolio.holdings.findIndex(
      (h) => h.symbol === holding.symbol,
    );

    if (existingHoldingIndex >= 0) {
      // Update existing holding (average cost calculation)
      const existing = portfolio.holdings[existingHoldingIndex];
      const existingCost = new Decimal(existing.avgCost);
      const existingQty = new Decimal(existing.quantity);
      const newCost = new Decimal(holding.avgCost);
      const newQty = new Decimal(holding.quantity);

      const totalQty = existingQty.plus(newQty);
      const weightedAvgCost = existingCost
        .times(existingQty)
        .plus(newCost.times(newQty))
        .div(totalQty);

      portfolio.holdings[existingHoldingIndex] = {
        symbol: holding.symbol,
        quantity: totalQty.toNumber(),
        avgCost: weightedAvgCost.toFixed(2),
        currentPrice: existing.currentPrice,
        lastUpdated: new Date(),
        assetType: holding.assetType || existing.assetType,
      };
    } else {
      // Add new holding
      portfolio.holdings.push({
        symbol: holding.symbol,
        quantity: holding.quantity,
        avgCost: new Decimal(holding.avgCost).toFixed(2),
        lastUpdated: new Date(),
        assetType: holding.assetType || "stock",
      });
    }

    await this.recalculateTotals(portfolio);
    return portfolio.save();
  }

  async updateHoldingPrice(
    portfolioId: string,
    symbol: string,
    currentPrice: number,
  ): Promise<void> {
    const portfolio = await this.portfolioModel.findById(portfolioId).exec();
    if (!portfolio) return;

    const holding = portfolio.holdings.find((h) => h.symbol === symbol);
    if (holding) {
      holding.currentPrice = new Decimal(currentPrice).toFixed(2);
      holding.lastUpdated = new Date();
      await this.recalculateTotals(portfolio);
      await portfolio.save();
    }
  }

  async removeHolding(
    portfolioId: string,
    userId: string,
    symbol: string,
  ): Promise<Portfolio> {
    const portfolio = await this.findById(portfolioId, userId);
    portfolio.holdings = portfolio.holdings.filter((h) => h.symbol !== symbol);
    await this.recalculateTotals(portfolio);
    return portfolio.save();
  }

  async getAIAnalysis(
    portfolioId: string,
    userId: string,
    userProfile: any,
  ): Promise<any> {
    const portfolio = await this.findById(portfolioId, userId);

    const analysis = await this.aiService.analyzePortfolio(
      {
        holdings: portfolio.holdings,
        totalValue: portfolio.totalValue,
      },
      userProfile,
    );

    // Store the analysis
    portfolio.aiInsights = {
      analysis: analysis.analysis,
      recommendations: analysis.recommendations,
      lastUpdated: new Date(),
    };
    portfolio.lastAnalyzedAt = new Date();
    await portfolio.save();

    return analysis;
  }

  async getPerformanceMetrics(
    portfolioId: string,
    userId: string,
  ): Promise<any> {
    const portfolio = await this.findById(portfolioId, userId);

    const totalValue = new Decimal(portfolio.totalValue || 0);
    const totalCost = new Decimal(portfolio.totalCost || 0);
    const gainLoss = totalValue.minus(totalCost);
    const gainLossPercent = totalCost.isZero()
      ? 0
      : gainLoss.div(totalCost).times(100).toNumber();

    const allocation = this.calculateAllocation(portfolio);
    const diversificationScore = this.calculateDiversificationScore(portfolio);

    return {
      totalValue: totalValue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalGainLoss: gainLoss.toFixed(2),
      totalGainLossPercent: gainLossPercent.toFixed(2),
      allocation,
      diversificationScore,
      holdingsCount: portfolio.holdings.length,
    };
  }

  private async recalculateTotals(portfolio: Portfolio): Promise<void> {
    let totalValue = new Decimal(0);
    let totalCost = new Decimal(0);

    // Fetch current prices for all holdings and calculate individual P&L
    for (const holding of portfolio.holdings) {
      const cost = new Decimal(holding.avgCost).times(holding.quantity);
      totalCost = totalCost.plus(cost);

      try {
        // Fetch real-time price from market data service
        const quote = await this.marketDataService.getQuote(holding.symbol);
        holding.currentPrice = new Decimal(quote.price).toFixed(2);
        holding.lastUpdated = new Date();

        const currentValue = new Decimal(holding.currentPrice).times(
          holding.quantity,
        );
        totalValue = totalValue.plus(currentValue);

        // Calculate individual holding P&L
        const holdingGainLoss = currentValue.minus(cost);
        const holdingGainLossPercent = cost.isZero()
          ? 0
          : holdingGainLoss.div(cost).times(100);

        // Add calculated values to holding
        holding.totalValue = currentValue.toFixed(2);
        holding.gainLoss = holdingGainLoss.toFixed(2);
        holding.gainLossPercentage =
          typeof holdingGainLossPercent === "number"
            ? holdingGainLossPercent
            : holdingGainLossPercent.toNumber();
      } catch (error) {
        // If price fetch fails, use cost price as fallback
        console.warn(
          `Failed to fetch price for ${holding.symbol}, using cost price`,
        );
        if (holding.currentPrice) {
          const currentValue = new Decimal(holding.currentPrice).times(
            holding.quantity,
          );
          totalValue = totalValue.plus(currentValue);

          // Calculate P&L with existing price
          const holdingGainLoss = currentValue.minus(cost);
          const holdingGainLossPercent = cost.isZero()
            ? 0
            : holdingGainLoss.div(cost).times(100);

          holding.totalValue = currentValue.toFixed(2);
          holding.gainLoss = holdingGainLoss.toFixed(2);
          holding.gainLossPercentage =
            typeof holdingGainLossPercent === "number"
              ? holdingGainLossPercent
              : holdingGainLossPercent.toNumber();
        } else {
          totalValue = totalValue.plus(cost);

          // No price available, set zero P&L
          holding.totalValue = cost.toFixed(2);
          holding.gainLoss = "0.00";
          holding.gainLossPercentage = 0;
        }
      }
    }

    // Mark holdings as modified for Mongoose to save subdocument changes
    portfolio.markModified("holdings");

    portfolio.totalValue = totalValue.toFixed(2);
    portfolio.totalCost = totalCost.toFixed(2);
    portfolio.totalGainLoss = totalValue.minus(totalCost).toFixed(2);
    portfolio.totalGainLossPercent = totalCost.isZero()
      ? 0
      : totalValue.minus(totalCost).div(totalCost).times(100).toNumber();
  }

  private calculateAllocation(portfolio: Portfolio): any {
    const allocation: Record<string, number> = {};
    const totalValue = new Decimal(portfolio.totalValue || 1);

    for (const holding of portfolio.holdings) {
      const value = holding.currentPrice
        ? new Decimal(holding.currentPrice).times(holding.quantity)
        : new Decimal(holding.avgCost).times(holding.quantity);

      const assetType = holding.assetType || "stock";
      allocation[assetType] =
        (allocation[assetType] || 0) +
        value.div(totalValue).times(100).toNumber();
    }

    return allocation;
  }

  private calculateDiversificationScore(portfolio: Portfolio): number {
    const holdingsCount = portfolio.holdings.length;
    if (holdingsCount === 0) return 0;

    // Simple diversification score based on number of holdings and allocation spread
    const allocation = this.calculateAllocation(portfolio);
    const assetTypes = Object.keys(allocation).length;

    // Score: 0-100
    // More holdings and more asset types = better diversification
    const holdingsScore = Math.min(holdingsCount * 5, 50); // max 50 points
    const assetTypeScore = assetTypes * 10; // max 50 points (5 types)

    return Math.min(holdingsScore + assetTypeScore, 100);
  }
}
