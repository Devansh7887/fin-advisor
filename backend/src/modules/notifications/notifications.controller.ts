import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Query("unreadOnly") unreadOnly: string,
    @Request() req,
  ) {
    return this.notificationsService.getNotifications(
      req.user.userId,
      unreadOnly === "true",
    );
  }

  @Post()
  async createNotification(@Body() data: any, @Request() req) {
    return this.notificationsService.createNotification(req.user.userId, data);
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Post("mark-all-read")
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { message: "All notifications marked as read" };
  }

  @Delete(":id")
  async deleteNotification(@Param("id") id: string, @Request() req) {
    await this.notificationsService.deleteNotification(id, req.user.userId);
    return { message: "Notification deleted" };
  }

  // Price Alerts
  @Post("price-alerts")
  async createPriceAlert(@Body() alertData: any, @Request() req) {
    return this.notificationsService.createPriceAlert(
      req.user.userId,
      alertData,
    );
  }

  @Get("price-alerts")
  async getPriceAlerts(
    @Query("activeOnly") activeOnly: string,
    @Request() req,
  ) {
    return this.notificationsService.getPriceAlerts(
      req.user.userId,
      activeOnly !== "false",
    );
  }

  @Delete("price-alerts/:id")
  async deletePriceAlert(@Param("id") id: string, @Request() req) {
    await this.notificationsService.deletePriceAlert(id, req.user.userId);
    return { message: "Price alert deleted" };
  }

  @Patch("price-alerts/:id/toggle")
  async togglePriceAlert(@Param("id") id: string, @Request() req) {
    return this.notificationsService.togglePriceAlert(id, req.user.userId);
  }
}
