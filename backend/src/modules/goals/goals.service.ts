import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Goal } from "./schemas/goal.schema";
import { AIService } from "../agents/ai.service";
import { PortfolioService } from "../portfolio/portfolio.service";
import { MarketDataService } from "../market-data/market-data.service";

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    @InjectModel(Goal.name) private goalModel: Model<Goal>,
    private aiService: AIService,
    private portfolioService: PortfolioService,
    private marketDataService: MarketDataService,
  ) {}

  async createGoal(userId: string, goalData: any): Promise<Goal> {
    try {
      this.logger.log(`Creating goal for user ${userId}: ${goalData.name}`);
      this.logger.log(`Goal data: ${JSON.stringify(goalData)}`);

      const goal = new this.goalModel({
        ...goalData,
        userId,
        targetDate: new Date(goalData.targetDate), // Convert string to Date
        currentAmount: goalData.currentAmount || 0,
        progress: 0,
        onTrack: true,
      });

      // Generate AI recommendations and allocation
      this.logger.log("Generating AI recommendations...");
      try {
        const aiAnalysis = await this.generateAIRecommendations(goalData);
        this.logger.log("AI recommendations generated successfully");
        goal.aiRecommendations = aiAnalysis.recommendations;
        goal.suggestedAllocation = aiAnalysis.allocation;
      } catch (error) {
        this.logger.warn(
          "Failed to generate AI recommendations, using defaults:",
          error.message,
        );
        // Use fallback recommendations if AI fails
        const fallback = this.getFallbackRecommendations(
          goalData.riskTolerance || "moderate",
        );
        goal.aiRecommendations = fallback.recommendations;
        goal.suggestedAllocation = fallback.allocation;
      }

      // Generate milestones
      goal.milestones = this.generateMilestones(
        goalData.targetAmount,
        new Date(goalData.targetDate), // Convert string to Date
        goalData.currentAmount || 0,
      );

      this.logger.log("Saving goal to database...");
      await goal.save();
      this.logger.log(`Goal created successfully with ID: ${goal._id}`);
      return goal;
    } catch (error) {
      this.logger.error(`Failed to create goal: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return this.goalModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getGoal(goalId: string, userId: string): Promise<Goal> {
    return this.goalModel.findOne({ _id: goalId, userId }).exec();
  }

  async updateGoal(
    goalId: string,
    userId: string,
    updates: any,
  ): Promise<Goal> {
    const goal = await this.goalModel.findOne({ _id: goalId, userId }).exec();
    if (!goal) return null;

    Object.assign(goal, updates);

    // Recalculate progress
    this.updateProgress(goal);

    await goal.save();
    return goal;
  }

  async updateProgress(goal: Goal): Promise<void> {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    goal.progress = Math.min(progress, 100);

    // Check if on track
    const today = new Date();
    const createdAt = (goal as any).createdAt || new Date();
    const totalDays = goal.targetDate.getTime() - createdAt.getTime();
    const daysPassed = today.getTime() - createdAt.getTime();
    const expectedProgress = (daysPassed / totalDays) * 100;

    goal.onTrack = progress >= expectedProgress - 10; // 10% tolerance

    if (progress >= 100) {
      goal.status = "achieved";
    }
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    await this.goalModel.deleteOne({ _id: goalId, userId }).exec();
  }

  private generateMilestones(
    targetAmount: number,
    targetDate: Date,
    currentAmount: number,
  ): any[] {
    const milestones = [];
    const months = Math.ceil(
      (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30),
    );
    const quarterlyAmount =
      (targetAmount - currentAmount) / Math.ceil(months / 3);

    for (let i = 1; i <= Math.ceil(months / 3); i++) {
      const milestoneDate = new Date();
      milestoneDate.setMonth(milestoneDate.getMonth() + i * 3);

      milestones.push({
        date: milestoneDate,
        targetAmount: currentAmount + quarterlyAmount * i,
        achieved: false,
      });
    }

    return milestones;
  }

  private async generateAIRecommendations(goalData: any): Promise<any> {
    const prompt = `As a financial advisor, provide recommendations for a user with this investment goal:

Goal: ${goalData.name}
Target Amount: $${goalData.targetAmount}
Time Horizon: ${Math.ceil((new Date(goalData.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365))} years
Risk Tolerance: ${goalData.riskTolerance || "moderate"}
Monthly Contribution: $${goalData.monthlyContribution || 0}

Provide your response in JSON format:
{
  "recommendations": "detailed investment strategy and recommendations",
  "allocation": [
    {
      "assetClass": "stocks",
      "percentage": 60,
      "reasoning": "explanation"
    },
    {
      "assetClass": "bonds",
      "percentage": 30,
      "reasoning": "explanation"
    },
    {
      "assetClass": "cash",
      "percentage": 10,
      "reasoning": "explanation"
    }
  ]
}`;

    try {
      const response = await this.aiService.quickChat(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.error("Failed to generate AI recommendations:", error);
    }

    // Fallback recommendations
    return this.getFallbackRecommendations("moderate");
  }

  private getFallbackRecommendations(riskTolerance: string): any {
    const allocations = {
      conservative: [
        {
          assetClass: "bonds",
          percentage: 50,
          reasoning: "Stability and capital preservation",
        },
        {
          assetClass: "stocks",
          percentage: 30,
          reasoning: "Moderate growth potential",
        },
        {
          assetClass: "cash",
          percentage: 20,
          reasoning: "Liquidity and safety",
        },
      ],
      moderate: [
        { assetClass: "stocks", percentage: 60, reasoning: "Long-term growth" },
        {
          assetClass: "bonds",
          percentage: 30,
          reasoning: "Stability and income",
        },
        {
          assetClass: "cash",
          percentage: 10,
          reasoning: "Liquidity and safety",
        },
      ],
      aggressive: [
        {
          assetClass: "stocks",
          percentage: 80,
          reasoning: "Maximum growth potential",
        },
        { assetClass: "bonds", percentage: 15, reasoning: "Minor stability" },
        { assetClass: "cash", percentage: 5, reasoning: "Emergency liquidity" },
      ],
    };

    return {
      recommendations: `Based on your ${riskTolerance} risk tolerance, we recommend a diversified portfolio focusing on ${riskTolerance === "aggressive" ? "high-growth stocks" : riskTolerance === "conservative" ? "stable bonds and income-generating assets" : "a balanced mix of stocks and bonds"}.`,
      allocation: allocations[riskTolerance] || allocations.moderate,
    };
  }

  async getGoalInsights(goalId: string, userId: string): Promise<any> {
    const goal = await this.getGoal(goalId, userId);
    if (!goal) return null;

    const today = new Date();
    const daysRemaining = Math.ceil(
      (goal.targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const amountRemaining = goal.targetAmount - goal.currentAmount;
    const requiredMonthlyContribution = amountRemaining / (daysRemaining / 30);

    // Generate dynamic stock recommendations using AI and market data
    const stockRecommendations = await this.generateDynamicStockRecommendations(
      goal.suggestedAllocation,
      amountRemaining,
      goal.riskTolerance || "moderate",
      goal.targetAmount,
    );

    return {
      progress: goal.progress,
      onTrack: goal.onTrack,
      daysRemaining,
      amountRemaining,
      requiredMonthlyContribution: Math.ceil(requiredMonthlyContribution),
      projectedCompletion: this.calculateProjectedCompletion(goal),
      stockRecommendations,
      aiRecommendations: goal.aiRecommendations,
      suggestedAllocation: goal.suggestedAllocation,
    };
  }

  private calculateProjectedCompletion(goal: Goal): Date {
    if (goal.monthlyContribution === 0) return null;

    const monthsNeeded =
      (goal.targetAmount - goal.currentAmount) / goal.monthlyContribution;
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + Math.ceil(monthsNeeded));

    return projectedDate;
  }

  /**
   * Generate dynamic stock recommendations using AI and real market data
   */
  private async generateDynamicStockRecommendations(
    allocation: any[],
    totalAmount: number,
    riskTolerance: string,
    targetAmount: number,
  ): Promise<any[]> {
    try {
      console.log(
        `🤖 Generating dynamic stock recommendations for ${riskTolerance} risk tolerance`,
      );

      // Use AI to get stock recommendations based on risk tolerance and current market
      const prompt = `As a financial advisor, recommend 4-5 specific stocks for a ${riskTolerance} risk tolerance investor.
      
Investment Details:
- Risk Tolerance: ${riskTolerance}
- Total Investment Amount: $${totalAmount.toLocaleString()}
- Goal Amount: $${targetAmount.toLocaleString()}
- Current Market Date: ${new Date().toLocaleDateString()}

Provide recommendations in this EXACT JSON format (no markdown, just raw JSON):
[
  {
    "symbol": "STOCK_SYMBOL",
    "name": "Company Name",
    "category": "Sector/Category",
    "reason": "Brief reason for recommendation"
  }
]

For ${riskTolerance} investors:
- Conservative: Focus on stable, dividend-paying blue-chip stocks (financials, consumer staples, healthcare)
- Moderate: Mix of growth and value stocks (tech leaders, established companies)
- Aggressive: High-growth potential stocks (tech, emerging sectors, innovation)

Return ONLY the JSON array, no other text.`;

      const aiResponse = await this.aiService.quickChat(prompt, []);
      console.log("📊 AI Response:", aiResponse.substring(0, 200));

      // Parse AI response to extract stock recommendations
      let stocksFromAI = [];
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResponse.match(/\[\s*{[\s\S]*}\s*\]/);
        if (jsonMatch) {
          stocksFromAI = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: try parsing the whole response
          stocksFromAI = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        // Fallback to default stocks if AI parsing fails
        stocksFromAI = this.getFallbackStocks(riskTolerance);
      }

      // Validate we have stocks
      if (!Array.isArray(stocksFromAI) || stocksFromAI.length === 0) {
        console.warn("No stocks from AI, using fallback");
        stocksFromAI = this.getFallbackStocks(riskTolerance);
      }

      // Fetch real market data for each recommended stock
      const stocksWithMarketData = await Promise.all(
        stocksFromAI.slice(0, 5).map(async (stock) => {
          try {
            const quote = await this.marketDataService.getQuote(stock.symbol);
            return {
              ...stock,
              currentPrice: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              marketCap: quote.marketCap,
            };
          } catch (error) {
            console.error(
              `Failed to fetch market data for ${stock.symbol}:`,
              error.message,
            );
            return stock;
          }
        }),
      );

      // Calculate recommended investment amount per stock
      const stocksAllocation = allocation?.find(
        (a) => a.assetClass === "stocks",
      );
      const stocksPercentage = stocksAllocation
        ? stocksAllocation.percentage
        : 60;
      const stocksAmount = (totalAmount * stocksPercentage) / 100;
      const amountPerStock = stocksAmount / stocksWithMarketData.length;

      return stocksWithMarketData.map((stock) => ({
        ...stock,
        recommendedAmount: Math.round(amountPerStock),
        percentageOfTotal:
          Math.round((amountPerStock / totalAmount) * 100 * 10) / 10,
      }));
    } catch (error) {
      console.error("Error generating dynamic recommendations:", error);
      // Fallback to basic recommendations
      return this.getFallbackStocksWithAmount(
        riskTolerance,
        totalAmount,
        allocation,
      );
    }
  }

  /**
   * Fallback stocks when AI is unavailable
   */
  private getFallbackStocks(riskTolerance: string): any[] {
    const stocksByRisk = {
      conservative: [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          category: "Large Cap Tech",
          reason: "Stable blue-chip with consistent dividends",
        },
        {
          symbol: "JNJ",
          name: "Johnson & Johnson",
          category: "Healthcare",
          reason: "Defensive stock with strong fundamentals",
        },
        {
          symbol: "PG",
          name: "Procter & Gamble",
          category: "Consumer Staples",
          reason: "Recession-resistant with steady growth",
        },
      ],
      moderate: [
        {
          symbol: "MSFT",
          name: "Microsoft",
          category: "Large Cap Tech",
          reason: "Strong growth with cloud computing leadership",
        },
        {
          symbol: "GOOGL",
          name: "Alphabet",
          category: "Technology",
          reason: "Diversified tech giant with AI potential",
        },
        {
          symbol: "V",
          name: "Visa",
          category: "Financial Services",
          reason: "Digital payments growth leader",
        },
      ],
      aggressive: [
        {
          symbol: "NVDA",
          name: "NVIDIA",
          category: "Technology",
          reason: "AI and GPU market leader with explosive growth",
        },
        {
          symbol: "TSLA",
          name: "Tesla",
          category: "Electric Vehicles",
          reason: "EV pioneer with innovative technology",
        },
        {
          symbol: "AMD",
          name: "AMD",
          category: "Semiconductors",
          reason: "High-growth chip maker competing with Intel",
        },
      ],
    };

    return stocksByRisk[riskTolerance] || stocksByRisk.moderate;
  }

  /**
   * Fallback with amount calculation
   */
  private getFallbackStocksWithAmount(
    riskTolerance: string,
    totalAmount: number,
    allocation: any[],
  ): any[] {
    const stocks = this.getFallbackStocks(riskTolerance);

    const stocksAllocation = allocation?.find((a) => a.assetClass === "stocks");
    const stocksPercentage = stocksAllocation
      ? stocksAllocation.percentage
      : 60;
    const stocksAmount = (totalAmount * stocksPercentage) / 100;
    const amountPerStock = stocksAmount / stocks.length;

    return stocks.map((stock) => ({
      ...stock,
      recommendedAmount: Math.round(amountPerStock),
      percentageOfTotal:
        Math.round((amountPerStock / totalAmount) * 100 * 10) / 10,
    }));
  }

  async addContribution(
    goalId: string,
    userId: string,
    amount: number,
  ): Promise<Goal> {
    const goal = await this.getGoal(goalId, userId);
    if (!goal) {
      throw new NotFoundException("Goal not found");
    }

    const newAmount = goal.currentAmount + amount;
    const updatedGoal = await this.updateGoal(goalId, userId, {
      currentAmount: newAmount,
    });

    console.log(
      `💰 Contribution added to goal ${goalId}: $${amount}. New total: $${newAmount}`,
    );
    return updatedGoal;
  }

  async syncPortfolioProfit(goalId: string, userId: string): Promise<Goal> {
    const goal = await this.getGoal(goalId, userId);
    if (!goal) {
      throw new NotFoundException("Goal not found");
    }

    // Get all user's portfolios
    const portfolios = await this.portfolioService.findAllByUser(userId);

    // Calculate total profit from all portfolios
    let totalProfit = 0;
    portfolios.forEach((portfolio) => {
      const gainLoss = parseFloat(portfolio.totalGainLoss || "0");
      if (gainLoss > 0) {
        totalProfit += gainLoss;
      }
    });

    console.log(
      `📊 Total portfolio profit for user ${userId}: $${totalProfit}`,
    );

    // Add profit to goal if there is any
    if (totalProfit > 0) {
      const newAmount = goal.currentAmount + totalProfit;
      const updatedGoal = await this.updateGoal(goalId, userId, {
        currentAmount: newAmount,
        lastSyncedAt: new Date(),
      });

      console.log(
        `✅ Portfolio profit synced to goal ${goalId}: $${totalProfit}. New total: $${newAmount}`,
      );
      return updatedGoal;
    }

    console.log(`ℹ️ No profit to sync for goal ${goalId}`);
    return goal;
  }
}
