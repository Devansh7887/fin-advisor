export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  database: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'financial_advisory',
  },
  
  redis: {
    url: process.env.REDIS_URL,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  
  ai: {
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_API_BASE_URL || 'https://openrouter.ai/api/v1',
    models: {
      advisor: process.env.MODEL_ADVISOR || 'google/gemini-2.5-pro',
      chat: process.env.MODEL_CHAT || 'google/gemini-2.5-flash',
      fast: process.env.MODEL_FAST || 'google/gemini-2.5-flash-lite',
      embeddings: process.env.MODEL_EMBEDDINGS || 'openai/text-embedding-3-small',
    },
  },
  
  marketData: {
    enableCache: process.env.ENABLE_MARKET_DATA_CACHE === 'true',
    cacheTTL: parseInt(process.env.MARKET_DATA_CACHE_TTL, 10) || 60,
  },
});
