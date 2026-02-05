"use client";

import { useState, useEffect } from "react";
import { notificationsAPI, portfolioAPI } from "@/lib/api";
import {
  Bell,
  BellOff,
  Check,
  Trash2,
  Plus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Notification {
  _id: string;
  type:
    | "price_alert"
    | "pattern_detected"
    | "news_sentiment"
    | "goal_milestone";
  title: string;
  message: string;
  symbol?: string;
  priority: "low" | "medium" | "high";
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

interface PriceAlert {
  _id: string;
  symbol: string;
  condition: "above" | "below" | "drop" | "rise";
  targetPrice?: number;
  percentageChange?: number;
  currentPrice?: number;
  active: boolean;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({
    symbol: "",
    condition: "above" as "above" | "below" | "drop" | "rise",
    targetPrice: "",
    percentageChange: "",
  });
  const [portfolioSymbols, setPortfolioSymbols] = useState<string[]>([]);

  useEffect(() => {
    fetchNotifications();
    fetchPriceAlerts();
    fetchPortfolioSymbols();
  }, []);

  const fetchPortfolioSymbols = async () => {
    try {
      const response = await portfolioAPI.getPortfolios();
      console.log("Portfolio response:", response);

      // Handle both response.data and direct response
      const portfolios = response.data || response;

      if (!portfolios || !Array.isArray(portfolios)) {
        console.warn("No portfolios found or invalid response");
        setPortfolioSymbols([]);
        return;
      }

      const symbols = portfolios.flatMap(
        (p: any) => p.holdings?.map((h: any) => h.symbol) || [],
      );
      const uniqueSymbols = [...new Set(symbols)] as string[];
      console.log("Extracted symbols:", uniqueSymbols);
      setPortfolioSymbols(uniqueSymbols);
    } catch (error) {
      console.error("Failed to fetch portfolio symbols:", error);
      setPortfolioSymbols([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getNotifications(false);
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const fetchPriceAlerts = async () => {
    try {
      const response = await notificationsAPI.getPriceAlerts(false);
      setPriceAlerts(response.data);
    } catch (error) {
      console.error("Failed to fetch price alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(
        notifications.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationsAPI.deleteNotification(id);
      setNotifications(notifications.filter((n) => n._id !== id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const createPriceAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (!alertForm.symbol) {
      alert("Please select or enter a symbol");
      return;
    }

    if (
      (alertForm.condition === "above" || alertForm.condition === "below") &&
      !alertForm.targetPrice
    ) {
      alert("Please enter a target price");
      return;
    }

    if (
      (alertForm.condition === "drop" || alertForm.condition === "rise") &&
      !alertForm.percentageChange
    ) {
      alert("Please enter a percentage change");
      return;
    }

    console.log("Creating price alert with data:", alertForm);

    try {
      const alertData = {
        symbol: alertForm.symbol.toUpperCase(),
        condition: alertForm.condition,
        targetPrice: alertForm.targetPrice
          ? parseFloat(alertForm.targetPrice)
          : undefined,
        percentageChange: alertForm.percentageChange
          ? parseFloat(alertForm.percentageChange)
          : undefined,
      };

      console.log("Sending alert data to API:", alertData);
      const response = await notificationsAPI.createPriceAlert(alertData);
      console.log("Price alert created successfully:", response.data);

      setAlertForm({
        symbol: "",
        condition: "above",
        targetPrice: "",
        percentageChange: "",
      });
      setShowCreateAlert(false);
      await fetchPriceAlerts();
      alert(
        "Price alert created successfully! You will be notified when the condition is met.",
      );
    } catch (error: any) {
      console.error("Failed to create price alert:", error);
      console.error("Error details:", error.response?.data);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create price alert";
      alert(`Error: ${errorMsg}`);
    }
  };

  const togglePriceAlert = async (id: string) => {
    try {
      await notificationsAPI.togglePriceAlert(id);
      setPriceAlerts(
        priceAlerts.map((a) =>
          a._id === id ? { ...a, active: !a.active } : a,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle price alert:", error);
    }
  };

  const deletePriceAlert = async (id: string) => {
    try {
      await notificationsAPI.deletePriceAlert(id);
      setPriceAlerts(priceAlerts.filter((a) => a._id !== id));
    } catch (error) {
      console.error("Failed to delete price alert:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 border-red-300";
      case "medium":
        return "bg-yellow-100 border-yellow-300";
      default:
        return "bg-blue-100 border-blue-300";
    }
  };

  const getConditionLabel = (
    condition: string,
    targetPrice?: number,
    percentageChange?: number,
  ) => {
    switch (condition) {
      case "above":
        return `Above $${targetPrice}`;
      case "below":
        return `Below $${targetPrice}`;
      case "drop":
        return `Drop ${percentageChange}%`;
      case "rise":
        return `Rise ${percentageChange}%`;
      default:
        return condition;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Notifications & Alerts
          </h1>
          <p className="text-gray-600">
            Manage your notifications and set up smart price alerts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Notifications</h2>
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`border rounded-lg p-4 ${getPriorityColor(notification.priority)} ${
                      !notification.read ? "border-l-4 border-l-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          {notification.symbol && (
                            <span className="px-2 py-0.5 bg-white rounded text-xs font-medium">
                              {notification.symbol}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="p-1 hover:bg-white rounded"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="p-1 hover:bg-white rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Alerts Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Price Alerts</h2>
              <button
                onClick={() => setShowCreateAlert(!showCreateAlert)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus className="w-4 h-4" />
                New Alert
              </button>
            </div>

            {/* Create Alert Form */}
            {showCreateAlert && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <form onSubmit={createPriceAlert} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Symbol
                    </label>
                    {portfolioSymbols.length > 0 ? (
                      <select
                        value={alertForm.symbol}
                        onChange={(e) =>
                          setAlertForm({ ...alertForm, symbol: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">Select from your holdings</option>
                        {portfolioSymbols.map((sym) => (
                          <option key={sym} value={sym}>
                            {sym}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={alertForm.symbol}
                        onChange={(e) =>
                          setAlertForm({ ...alertForm, symbol: e.target.value })
                        }
                        placeholder="e.g., AAPL"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition
                    </label>
                    <select
                      value={alertForm.condition}
                      onChange={(e) =>
                        setAlertForm({
                          ...alertForm,
                          condition: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="above">Price Above</option>
                      <option value="below">Price Below</option>
                      <option value="drop">Price Drop %</option>
                      <option value="rise">Price Rise %</option>
                    </select>
                  </div>
                  {(alertForm.condition === "above" ||
                    alertForm.condition === "below") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Price ($)
                      </label>
                      <input
                        type="number"
                        value={alertForm.targetPrice}
                        onChange={(e) =>
                          setAlertForm({
                            ...alertForm,
                            targetPrice: e.target.value,
                          })
                        }
                        placeholder="150.00"
                        required
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  )}
                  {(alertForm.condition === "drop" ||
                    alertForm.condition === "rise") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Percentage Change (%)
                      </label>
                      <input
                        type="number"
                        value={alertForm.percentageChange}
                        onChange={(e) =>
                          setAlertForm({
                            ...alertForm,
                            percentageChange: e.target.value,
                          })
                        }
                        placeholder="5"
                        required
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Create Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateAlert(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Price Alerts List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : priceAlerts.length === 0 ? (
              <div className="text-center py-12">
                <BellOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No price alerts yet</p>
                <p className="text-sm text-gray-500">
                  Create an alert to monitor price movements
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {priceAlerts.map((alert) => (
                  <div
                    key={alert._id}
                    className={`border rounded-lg p-4 ${
                      alert.triggered
                        ? "bg-purple-50 border-purple-200"
                        : alert.active
                          ? "bg-green-50 border-green-200"
                          : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {alert.symbol}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              alert.triggered
                                ? "bg-purple-200 text-purple-800"
                                : alert.active
                                  ? "bg-green-200 text-green-800"
                                  : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            {alert.triggered
                              ? "Triggered"
                              : alert.active
                                ? "Active"
                                : "Inactive"}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 mb-1">
                          {getConditionLabel(
                            alert.condition,
                            alert.targetPrice,
                            alert.percentageChange,
                          )}
                        </p>

                        {alert.currentPrice && (
                          <p className="text-sm text-gray-600">
                            Current: ${alert.currentPrice.toFixed(2)}
                          </p>
                        )}

                        {alert.triggered && alert.triggeredAt && (
                          <p className="text-xs text-purple-600 mt-1">
                            Triggered:{" "}
                            {new Date(alert.triggeredAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => togglePriceAlert(alert._id)}
                          className="p-1 hover:bg-white rounded"
                          title={alert.active ? "Deactivate" : "Activate"}
                        >
                          {alert.active ? (
                            <Bell className="w-4 h-4 text-green-600" />
                          ) : (
                            <BellOff className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => deletePriceAlert(alert._id)}
                          className="p-1 hover:bg-white rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 Price alerts are checked automatically every 5 minutes.
                You'll receive a notification when triggered.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
