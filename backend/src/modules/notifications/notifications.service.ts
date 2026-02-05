import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Notification } from "./schemas/notification.schema";
import { PriceAlert } from "./schemas/price-alert.schema";
import { MarketDataService } from "../market-data/market-data.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(PriceAlert.name)
    private priceAlertModel: Model<PriceAlert>,
    private marketDataService: MarketDataService,
  ) {}

  async createNotification(userId: string, data: any): Promise<Notification> {
    return this.notificationModel.create({
      userId,
      ...data,
    });
  }

  async getNotifications(
    userId: string,
    unreadOnly = false,
  ): Promise<Notification[]> {
    const query: any = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    return this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    return this.notificationModel
      .findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true },
      )
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany({ userId, read: false }, { read: true })
      .exec();
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.notificationModel
      .deleteOne({ _id: notificationId, userId })
      .exec();
  }

  // Price Alerts
  async createPriceAlert(userId: string, alertData: any): Promise<PriceAlert> {
    this.logger.log(
      `Creating price alert for user ${userId}: ${alertData.symbol} ${alertData.condition}`,
    );
    try {
      const alert = await this.priceAlertModel.create({
        userId,
        ...alertData,
      });
      this.logger.log(`Price alert created successfully with ID: ${alert._id}`);
      return alert;
    } catch (error) {
      this.logger.error("Failed to create price alert:", error);
      throw error;
    }
  }

  async getPriceAlerts(
    userId: string,
    activeOnly = true,
  ): Promise<PriceAlert[]> {
    const query: any = { userId };
    if (activeOnly) {
      query.active = true;
    }

    return this.priceAlertModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async deletePriceAlert(alertId: string, userId: string): Promise<void> {
    await this.priceAlertModel.deleteOne({ _id: alertId, userId }).exec();
  }

  async togglePriceAlert(alertId: string, userId: string): Promise<PriceAlert> {
    const alert = await this.priceAlertModel
      .findOne({ _id: alertId, userId })
      .exec();
    if (alert) {
      alert.active = !alert.active;
      await alert.save();
    }
    return alert;
  }

  // Check price alerts every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPriceAlerts() {
    this.logger.log("Checking price alerts...");

    const alerts = await this.priceAlertModel
      .find({ active: true, triggered: false })
      .exec();

    for (const alert of alerts) {
      try {
        const quote = await this.marketDataService.getQuote(alert.symbol);
        const currentPrice = quote.price;
        alert.currentPrice = currentPrice;

        let shouldTrigger = false;
        let message = "";

        switch (alert.condition) {
          case "above":
            if (currentPrice >= alert.targetPrice) {
              shouldTrigger = true;
              message = `${alert.symbol} is now above $${alert.targetPrice} at $${currentPrice.toFixed(2)}`;
            }
            break;
          case "below":
            if (currentPrice <= alert.targetPrice) {
              shouldTrigger = true;
              message = `${alert.symbol} is now below $${alert.targetPrice} at $${currentPrice.toFixed(2)}`;
            }
            break;
          case "drop":
            const dropPercent =
              ((alert.targetPrice - currentPrice) / alert.targetPrice) * 100;
            if (dropPercent >= alert.percentageChange) {
              shouldTrigger = true;
              message = `${alert.symbol} dropped ${dropPercent.toFixed(1)}% to $${currentPrice.toFixed(2)}`;
            }
            break;
          case "rise":
            const risePercent =
              ((currentPrice - alert.targetPrice) / alert.targetPrice) * 100;
            if (risePercent >= alert.percentageChange) {
              shouldTrigger = true;
              message = `${alert.symbol} rose ${risePercent.toFixed(1)}% to $${currentPrice.toFixed(2)}`;
            }
            break;
        }

        if (shouldTrigger) {
          alert.triggered = true;
          alert.triggeredAt = new Date();
          await alert.save();

          // Create notification
          await this.createNotification(alert.userId, {
            type: "price_alert",
            title: `Price Alert: ${alert.symbol}`,
            message,
            symbol: alert.symbol,
            priority: "high",
            actionUrl: `/dashboard/analytics?symbol=${alert.symbol}`,
            metadata: {
              currentPrice,
              targetPrice: alert.targetPrice,
              condition: alert.condition,
            },
          });

          this.logger.log(`Price alert triggered for ${alert.symbol}`);
        }
      } catch (error) {
        this.logger.error(`Failed to check alert for ${alert.symbol}:`, error);
      }
    }
  }

  // Helper method to send notifications for other modules
  async sendPriceDropAlert(
    userId: string,
    symbol: string,
    dropPercent: number,
    currentPrice: number,
  ) {
    await this.createNotification(userId, {
      type: "price_alert",
      title: `${symbol} Price Drop`,
      message: `${symbol} dropped ${dropPercent.toFixed(1)}% - consider buying the dip?`,
      symbol,
      priority: dropPercent > 10 ? "urgent" : "high",
      actionUrl: `/dashboard/portfolio`,
      metadata: { dropPercent, currentPrice },
    });
  }

  async sendEarningsAlert(userId: string, symbol: string, date: Date) {
    await this.createNotification(userId, {
      type: "earnings",
      title: `Upcoming Earnings: ${symbol}`,
      message: `${symbol} earnings report scheduled for ${date.toLocaleDateString()}`,
      symbol,
      priority: "medium",
      actionUrl: `/dashboard/analytics?symbol=${symbol}`,
      metadata: { earningsDate: date },
    });
  }

  async sendDividendAlert(
    userId: string,
    symbol: string,
    amount: number,
    date: Date,
  ) {
    await this.createNotification(userId, {
      type: "dividend",
      title: `Dividend Payment: ${symbol}`,
      message: `Upcoming dividend payment of $${amount} per share on ${date.toLocaleDateString()}`,
      symbol,
      priority: "low",
      actionUrl: `/dashboard/portfolio`,
      metadata: { amount, paymentDate: date },
    });
  }

  async sendGoalMilestoneAlert(
    userId: string,
    goalName: string,
    progress: number,
  ) {
    await this.createNotification(userId, {
      type: "goal_milestone",
      title: `Goal Milestone Reached!`,
      message: `You've reached ${progress}% of your "${goalName}" goal!`,
      priority: "medium",
      actionUrl: `/dashboard/goals`,
      metadata: { goalName, progress },
    });
  }
}
