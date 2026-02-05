import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        "🔑 Token added to request:",
        config.method?.toUpperCase(),
        config.url,
      );
    } else {
      console.warn(
        "⚠️ No token found for request:",
        config.method?.toUpperCase(),
        config.url,
      );
    }
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log(
      "✅ API Response:",
      response.config.method?.toUpperCase(),
      response.config.url,
      response.status,
    );
    return response;
  },
  (error) => {
    console.error(
      "❌ API Error:",
      error.config?.method?.toUpperCase(),
      error.config?.url,
    );
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: any) => api.put("/users/profile", data),
};

// Portfolio API
export const portfolioAPI = {
  getPortfolios: () => api.get("/portfolios").then((res) => res.data),
  getAll: () => api.get("/portfolios"),
  getById: (id: string) => api.get(`/portfolios/${id}`),
  create: (data: { name: string }) => api.post("/portfolios", data),
  addHolding: (id: string, holding: any) =>
    api.post(`/portfolios/${id}/holdings`, holding),
  removeHolding: (id: string, symbol: string) =>
    api.delete(`/portfolios/${id}/holdings/${symbol}`),
  getAnalysis: (id: string) => api.get(`/portfolios/${id}/analysis`),
  getMetrics: (id: string) => api.get(`/portfolios/${id}/metrics`),
};

// Market Data API
export const marketDataAPI = {
  getQuote: (symbol: string) => api.get(`/market-data/quote/${symbol}`),
  getHistorical: (symbol: string, period?: string) =>
    api.get(`/market-data/historical/${symbol}`, { params: { period } }),
  search: (query: string) =>
    api.get("/market-data/search", { params: { q: query } }),
  getBatch: (symbols: string[]) =>
    api.get("/market-data/batch", { params: { symbols: symbols.join(",") } }),
  getInfo: (symbol: string) => api.get(`/market-data/info/${symbol}`),
  getIndicators: (symbol: string, period?: string) =>
    api.get(`/market-data/indicators/${symbol}`, { params: { period } }),
};

// Chat API
export const chatAPI = {
  getConversations: () => api.get("/chat/conversations"),
  getConversation: (id: string) => api.get(`/chat/conversations/${id}`),
  createConversation: (data: { title?: string }) =>
    api.post("/chat/conversations", data),
  sendMessage: (
    id: string,
    data: { message: string; type?: "quick" | "advice" },
  ) => api.post(`/chat/conversations/${id}/messages`, data),
  deleteConversation: (id: string) => api.delete(`/chat/conversations/${id}`),
};

// Chart Patterns API
export const chartPatternsAPI = {
  analyzePattern: (symbol: string) =>
    api.post(`/chart-patterns/analyze/${symbol}`),
  getAlerts: () => api.get("/chart-patterns/alerts"),
  markAsRead: (id: string) => api.post(`/chart-patterns/alerts/${id}/read`),
  deleteAlert: (id: string) => api.delete(`/chart-patterns/alerts/${id}`),
};

// News API
export const newsAPI = {
  analyzeNews: (symbol: string) => api.post(`/news/analyze/${symbol}`),
  getNewsBySymbol: (symbol: string) => api.get(`/news/symbol/${symbol}`),
  getNewsByPortfolio: (symbols: string[]) =>
    api.post("/news/portfolio", { symbols }),
  getSentimentSummary: (symbol: string) => api.get(`/news/sentiment/${symbol}`),
};

// Goals API
export const goalsAPI = {
  createGoal: (data: any) => api.post("/goals", data),
  getGoals: () => api.get("/goals"),
  getGoal: (id: string) => api.get(`/goals/${id}`),
  updateGoal: (id: string, data: any) => api.put(`/goals/${id}`, data),
  deleteGoal: (id: string) => api.delete(`/goals/${id}`),
  getGoalInsights: (id: string) => api.get(`/goals/${id}/insights`),
  addContribution: (id: string, data: { amount: number }) =>
    api.post(`/goals/${id}/contribution`, data),
  syncPortfolioProfit: (id: string) =>
    api.post(`/goals/${id}/sync-portfolio-profit`),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (unreadOnly = false) =>
    api.get("/notifications", { params: { unreadOnly } }),
  createNotification: (data: any) => api.post("/notifications", data),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post("/notifications/mark-all-read"),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),

  // Price Alerts
  createPriceAlert: (data: any) =>
    api.post("/notifications/price-alerts", data),
  getPriceAlerts: (activeOnly = true) =>
    api.get("/notifications/price-alerts", { params: { activeOnly } }),
  deletePriceAlert: (id: string) =>
    api.delete(`/notifications/price-alerts/${id}`),
  togglePriceAlert: (id: string) =>
    api.patch(`/notifications/price-alerts/${id}/toggle`),
};
