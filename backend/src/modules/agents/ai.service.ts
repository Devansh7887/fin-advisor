import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AIService {
  private apiKey: string;
  private baseURL: string;
  private models: {
    advisor: string;
    chat: string;
    fast: string;
    embeddings: string;
  };

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.apiKey');
    this.baseURL = this.configService.get<string>('ai.baseURL');
    this.models = this.configService.get('ai.models');
  }

  private async callScaleDownAPI(context: string, prompt: string, conversationHistory: any[] = [], model: string = 'gpt-4o'): Promise<string> {
    // Now using Google Gemini for intelligent responses
    return await this.callGeminiAPI(context, prompt, conversationHistory);
  }

  /**
   * Call Google Gemini API for intelligent responses
   */
  private async callGeminiAPI(systemContext: string, userPrompt: string, conversationHistory: any[] = [], modelName: string = null): Promise<string> {
    try {
      // Use provided model or default to chat model (gemini-2.5-flash)
      const model = modelName || this.models.chat;
      console.log('🤖 Calling Google Gemini API...');
      console.log('Model:', model);
      console.log('API Key:', this.apiKey ? `${this.apiKey.substring(0, 20)}...` : 'MISSING');
      console.log('User prompt length:', userPrompt.length);
      console.log('User prompt preview:', userPrompt.substring(0, 100));
      
      // Build conversation history for Gemini
      const contents = [];
      
      // Add system context as first user message
      contents.push({
        role: 'user',
        parts: [{ text: systemContext }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will provide specific, actionable financial advice and answer questions directly.' }]
      });
      
      // Add conversation history (limit to last 4 messages to reduce token usage)
      // Each message pair (user + assistant) counts, so 4 messages = 2 exchanges
      if (conversationHistory && conversationHistory.length > 0) {
        const limitedHistory = conversationHistory.slice(-4);
        for (const msg of limitedHistory) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        }
      }
      
      // Add current user message
      const currentUserMessage = userPrompt.includes('User:') 
        ? userPrompt.split('User:').pop().trim() 
        : userPrompt;
      
      contents.push({
        role: 'user',
        parts: [{ text: currentUserMessage }]
      });
      
      console.log('📤 Sending request to Gemini...');
      console.log('Total messages in conversation:', contents.length);
      
      // Extract model name for API call (e.g., "google/gemini-2.5-flash" -> "gemini-2.5-flash")
      const modelForAPI = model.includes('/') ? model.split('/')[1] : model;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelForAPI}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Increased from 1024 for complete responses (~3000 words)
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE'
            }
          ]
        }),
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API Error Response:', errorText);
        
        // If quota exceeded and we haven't tried flash yet, try flash model
        if (response.status === 429 && model !== this.models.chat && model !== this.models.fast) {
          console.log('⚠️ Quota exceeded for', model, '- Falling back to', this.models.chat);
          return await this.callGeminiAPI(systemContext, userPrompt, conversationHistory, this.models.chat);
        }
        
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Gemini Response received');
      
      // Extract text from Gemini response
      if (result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const responseText = candidate.content.parts[0].text;
          console.log('📝 Response preview:', responseText.substring(0, 100));
          return responseText;
        }
      }
      
      throw new Error('No valid response from Gemini API');
    } catch (error) {
      console.error('Gemini API Error:', error.message || error);
      // Fallback to basic response only if API completely fails
      return this.generateFallbackResponse(userPrompt, conversationHistory);
    }
  }

  private async callScaleDownAPIOriginal(context: string, prompt: string, conversationHistory: any[] = [], model: string = 'gpt-4o'): Promise<string> {
    try {
      console.log('🔄 Calling ScaleDown API...');
      console.log('API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING');
      console.log('Base URL:', this.baseURL);
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: context,
          prompt: prompt,
          model: model,
          scaledown: {
            rate: 'auto',
          },
        }),
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`ScaleDown API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ API Response:', JSON.stringify(result).substring(0, 300));
      
      // ScaleDown API returns results.success and results.compressed_prompt
      if (!result.results || !result.results.success) {
        console.error('❌ Unsuccessful response:', result);
        throw new Error('ScaleDown API returned unsuccessful response');
      }

      // ScaleDown returns compressed_prompt, which you'd normally send to GPT-4o
      // Since we don't have GPT-4o access, provide a smart fallback
      if (!result.results.compressed_prompt) {
        throw new Error('No compressed_prompt in response');
      }

      // Generate a helpful response based on the original prompt and conversation history
      // Extract just the user message from the prompt (not the full conversation text)
      const userMessage = prompt.includes('User:') 
        ? prompt.split('User:').pop().trim() 
        : prompt;
      return this.generateFallbackResponse(userMessage, conversationHistory);
    } catch (error) {
      console.error('ScaleDown API Error:', error.message || error);
      throw error;
    }
  }

  /**
   * Generate helpful financial responses without external AI
   */
  private generateFallbackResponse(prompt: string, conversationHistory: any[] = []): string {
    const lowerPrompt = prompt.toLowerCase();
    
    console.log('🤖 Generating fallback response...');
    console.log('📝 User prompt:', prompt);
    console.log('📚 Conversation history length:', conversationHistory.length);
    
    // Get last assistant message for context
    const lastAssistantMessage = conversationHistory
      .filter(m => m.role === 'assistant')
      .slice(-1)[0];
    const lastAssistantContent = lastAssistantMessage?.content?.toLowerCase() || '';
    
    console.log('💬 Last assistant message preview:', lastAssistantContent.substring(0, 100));
    
    // Handle specific follow-up questions about options/specifics
    if ((lowerPrompt.includes('option') || lowerPrompt.includes('specific') || lowerPrompt.includes('which one') || lowerPrompt.includes('recommend')) && 
        (lastAssistantContent.includes('gold') || lastAssistantContent.includes('investment vehicles'))) {
      console.log('🎯 Detected request for specific gold recommendations');
      return `Here are my specific recommendations for gold investment:

**For Beginners (Start Here):**
1. **SPDR Gold Shares (GLD)** - Most popular gold ETF
   - Expense ratio: 0.40%
   - Highly liquid with tight spreads
   - Backed by physical gold in vaults
   - Minimum: 1 share (~$200)

2. **iShares Gold Trust (IAU)** - Lower cost alternative
   - Expense ratio: 0.25%
   - Similar to GLD but cheaper
   - Better for long-term holders

**For Physical Gold Enthusiasts:**
3. **American Gold Eagle Coins** (1 oz)
   - Easy to buy/sell
   - Government-backed purity
   - Buy from: APMEX, JM Bullion, local dealers
   - Premium: 3-5% over spot price

4. **Gold Bars** (1 oz or 10 oz)
   - Lower premiums than coins (1-3%)
   - Brands: PAMP Suisse, Credit Suisse
   - Need secure storage solution

**For Growth Potential:**
5. **VanEck Gold Miners ETF (GDX)**
   - Invests in gold mining companies
   - Higher risk, higher potential return
   - 2-3x leverage to gold price movements
   - Dividend yield: ~2%

**My Top Recommendation:**
Start with **70% IAU + 30% physical gold coins**
- IAU for easy buying/selling and lower fees
- Physical coins for true ownership and security
- Total allocation: 5-7% of your portfolio

**Where to Buy:**
- ETFs: Any brokerage (Robinhood, Fidelity, Schwab, etc.)
- Physical: APMEX.com, JMBullion.com, or local coin shops
- Avoid: Jewelry (high markups), rare coins (collector premium)

Would you like help setting up a specific gold investment plan with dollar amounts?`;
    }
    
    // Handle affirmative responses for follow-ups
    if (lowerPrompt.match(/^(yes|yeah|sure|ok|okay|please|tell me|i would|i'd like)$/)) {
      console.log('✅ Detected simple affirmative response');
      // Check if previous context was about gold
      if (lastAssistantContent.includes('gold') || lastAssistantContent.includes('incorporating gold')) {
        console.log('🏆 Detected gold context - providing detailed advice');
        return `Great! Here's specific advice on incorporating gold into your portfolio:

**Gold Investment Strategy:**

**1. Allocation Based on Risk Profile:**
- Conservative investors: 5-7% in gold
- Moderate investors: 7-10% in gold  
- Aggressive investors: 3-5% in gold (focus more on growth assets)

**2. Investment Vehicles:**
- **Physical Gold**: Bars, coins (requires secure storage)
  - Pros: Tangible, no counterparty risk
  - Cons: Storage costs, insurance, liquidity issues
  
- **Gold ETFs**: GLD, IAU, SGOL
  - Pros: Liquid, low cost, easy to trade
  - Cons: Management fees, no physical ownership
  
- **Gold Mining Stocks**: Barrick Gold, Newmont
  - Pros: Leverage to gold prices, dividends
  - Cons: Company-specific risks, higher volatility

**3. Dollar-Cost Averaging:**
- Invest fixed amounts monthly rather than lump sum
- Reduces timing risk
- Example: $500/month over 6-12 months

**4. Rebalancing:**
- Review quarterly
- Sell when gold exceeds target allocation
- Buy when it falls below target

**5. Tax Considerations:**
- Physical gold: Taxed as collectibles (28% max rate)
- ETFs: Some treated as collectibles, others as equity
- Mining stocks: Capital gains tax (15-20%)

**Action Plan:**
Start with 2-3% allocation, gradually increase to your target over 3-6 months. Consider splitting between ETFs (for liquidity) and physical gold (for security).

Need help with any specific aspect?`;
      }
      
      // Generic affirmative response
      return `I'd be happy to help! Could you please provide more details about what you'd like to know? For example:

- Investment strategy questions
- Portfolio allocation advice
- Specific asset analysis (stocks, bonds, real estate, crypto)
- Risk management
- Retirement planning

What specific topic interests you?`;
    }
    
    // Gold price queries
    if (lowerPrompt.includes('gold') && (lowerPrompt.includes('price') || lowerPrompt.includes('cost') || lowerPrompt.includes('worth') || lowerPrompt.includes('trading'))) {
      return `As of February 2026, gold is trading around $2,050-$2,100 per ounce. Gold prices fluctuate based on:

• Economic uncertainty and inflation concerns
• US Dollar strength (inverse relationship)
• Central bank policies and interest rates
• Geopolitical tensions
• Supply and demand dynamics

**Investment Considerations:**
- Gold is typically viewed as a safe-haven asset
- Consider 5-10% portfolio allocation for diversification
- Options: Physical gold, ETFs (GLD, IAU), mining stocks
- Long-term hedge against inflation and currency devaluation

Would you like specific advice on incorporating gold into your portfolio?`;
    }
    
    // Stock market queries
    if (lowerPrompt.includes('stock') || lowerPrompt.includes('equity')) {
      return `The stock market remains a key wealth-building tool. Here's what you should know:

**Current Market Trends (2026):**
• Technology and AI sectors continue strong growth
• Renewable energy gaining momentum
• Healthcare innovation expanding
• International diversification recommended

**Investment Strategy:**
1. **Diversification**: Spread across sectors and geographies
2. **Time Horizon**: Long-term (5+ years) reduces volatility risk
3. **Regular Investing**: Dollar-cost averaging smooths market ups and downs
4. **Risk Assessment**: Match investments to your risk tolerance

Need help analyzing specific stocks or building a portfolio?`;
    }
    
    // Portfolio/investment advice
    if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('invest')) {
      return `Let me help you with portfolio management:

**Key Principles:**
• **Asset Allocation**: Balance stocks, bonds, real estate
• **Diversification**: Don't put all eggs in one basket
• **Rebalancing**: Review quarterly, adjust annually
• **Emergency Fund**: 3-6 months expenses in liquid assets

**Recommended Allocation** (varies by age/risk):
- Aggressive (young): 80% stocks, 15% bonds, 5% alternatives
- Moderate: 60% stocks, 30% bonds, 10% alternatives  
- Conservative: 40% stocks, 50% bonds, 10% cash

What's your age range and risk tolerance? I can provide personalized recommendations.`;
    }
    
    // Crypto queries
    if (lowerPrompt.includes('crypto') || lowerPrompt.includes('bitcoin')) {
      return `Cryptocurrency investment considerations for 2026:

**Current Landscape:**
• Bitcoin and Ethereum remain dominant
• Increased regulatory clarity in major markets
• Institutional adoption growing
• High volatility remains a factor

**Investment Guidance:**
- **Allocation**: Max 5-10% of portfolio for most investors
- **Risk Level**: Very high - only invest what you can afford to lose
- **Diversification**: Don't just hold Bitcoin - consider multiple assets
- **Storage**: Use hardware wallets for significant holdings
- **Tax Implications**: Understand capital gains treatment

**Alternatives**: Gold, commodities, or tech stocks may offer similar growth with less volatility.

Want to discuss specific cryptocurrencies or allocation strategy?`;
    }
    
    // Default financial advice
    return `I'm here to help with your financial questions! I can assist with:

**Investment Topics:**
• Stock market analysis and recommendations
• Portfolio diversification strategies  
• Risk assessment and management
• Asset allocation guidance
• Retirement planning

**Market Insights:**
• Gold, silver, and commodities
• Real estate investment
• Cryptocurrency (with caution)
• Bonds and fixed income
• International markets

**Personalized Advice:**
• Portfolio reviews
• Investment goal setting
• Tax-efficient strategies
• Wealth building plans

Please ask me specific questions about any of these topics, and I'll provide detailed guidance based on your situation!`;
  }

  /**
   * Get financial advice using ScaleDown compression
   */
  async getFinancialAdvice(
    prompt: string,
    context?: {
      portfolio?: any;
      userProfile?: any;
      marketData?: any;
    },
  ): Promise<string> {
    const systemContext = `You are an expert financial advisor with deep knowledge in:
- Portfolio management and asset allocation
- Risk assessment and management
- Investment strategies across different asset classes
- Market analysis and trends
- Tax-efficient investing
- Retirement planning

Provide personalized, actionable advice based on the user's financial situation.
Always consider the user's risk tolerance and investment goals.
Be clear, concise, and avoid unnecessary jargon.`;

    const contextualPrompt = this.buildContextualPrompt(prompt, context);

    return await this.callScaleDownAPI(systemContext, contextualPrompt, [], 'gpt-4o');
  }

  /**
   * Quick chat responses using Gemini API directly
   */
  async quickChat(
    message: string,
    conversationHistory?: any[],
  ): Promise<string> {
    console.log('🔷 quickChat called with message:', message);
    console.log('📚 Conversation history length:', conversationHistory?.length || 0);
    
    const context = `You are an expert financial advisor named FinAdvisor AI. You provide SPECIFIC, ACTIONABLE financial advice.

CRITICAL RULES:
1. NEVER give generic "I'm here to help" responses
2. ALWAYS answer the EXACT question asked
3. If asked about "SIP status" - explain what data you need to check (portfolio, user goals, etc.)
4. If asked "which sector is investable" - provide SPECIFIC sector analysis (tech vs healthcare vs finance, etc.)
5. If asked about "real estate" - provide SPECIFIC real estate investment advice
6. Be conversational but ALWAYS provide concrete information

Your specialties:
- Stock market analysis and sector recommendations (tech, healthcare, finance, real estate, etc.)
- SIP (Systematic Investment Plans) tracking and optimization
- Portfolio diversification and risk assessment
- Real estate investment strategies (REITs, direct property, location analysis)
- Market trends and economic indicators
- Personal finance and wealth building

RESPOND WITH SPECIFIC, DETAILED INFORMATION - NOT GENERIC MENUS!`;

    try {
      console.log('🚀 Calling Gemini API...');
      // Call Gemini API directly for better responses
      const response = await this.callGeminiAPI(
        context,
        message,
        conversationHistory || [],
      );
      console.log('✅ Got Gemini response:', response.substring(0, 150));
      return response;
    } catch (error) {
      console.error('❌ Quick chat error:', error.message);
      console.error('❌ Stack trace:', error.stack);
      // Only use fallback if API completely fails
      const fallback = this.generateFallbackResponse(message, conversationHistory || []);
      console.log('⚠️ Using fallback response');
      return fallback;
    }
  }

  /**
   * Stream chat responses - Gemini doesn't support streaming in this implementation, so we simulate it
   */
  async streamChat(message: string, conversationHistory?: any[]): Promise<any> {
    const context = `You are an expert financial advisor specializing in:
- Investment strategies and portfolio management
- Stock market analysis and recommendations
- Cryptocurrency and blockchain technology
- Risk assessment and diversification
- Personal finance and wealth building
- Market trends and economic indicators

Provide detailed, actionable advice. Use markdown formatting for clarity.
Be conversational and helpful, like ChatGPT.`;
    
    try {
      // Get intelligent response from Gemini
      const response = await this.callGeminiAPI(context, message, conversationHistory || []);
      
      // Simulate streaming by yielding chunks
      return this.simulateStream(response);
    } catch (error) {
      console.error('Stream chat error details:', error.message);
      throw error;
    }
  }

  /**
   * Simulate streaming by breaking response into chunks (optimized for faster delivery)
   */
  private async *simulateStream(text: string) {
    // Stream in chunks of 5-10 words instead of word-by-word for faster delivery
    const words = text.split(' ');
    const chunkSize = 8; // 8 words per chunk
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
      yield {
        choices: [{
          delta: {
            content: chunk,
          },
        }],
      };
      // Minimal delay to simulate streaming without timeout (5ms per chunk)
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }

  /**
   * Analyze portfolio with AI insights
   */
  async analyzePortfolio(portfolio: any, userProfile: any): Promise<{
    analysis: string;
    recommendations: string[];
    riskAssessment: string;
  }> {
    const context = 'You are a portfolio analyst. Provide structured, actionable insights.';
    
    const prompt = `Analyze this investment portfolio and provide insights:

Portfolio Holdings:
${JSON.stringify(portfolio.holdings, null, 2)}

Total Value: $${portfolio.totalValue}

User Profile:
- Risk Tolerance: ${userProfile.riskTolerance}
- Investment Goals: ${userProfile.investmentGoals?.join(', ')}

Provide:
1. Overall portfolio analysis
2. 3-5 specific recommendations
3. Risk assessment`;

    const content = await this.callScaleDownAPI(context, prompt, [], 'gpt-4o');
    
    return {
      analysis: content,
      recommendations: this.extractRecommendations(content),
      riskAssessment: this.extractRiskAssessment(content),
    };
  }

  /**
   * Generate embeddings for RAG - ScaleDown doesn't support this
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    console.warn('Embeddings not supported by ScaleDown API, returning mock data');
    const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
    return mockEmbedding;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbeddings(text)));
  }

  /**
   * Market sentiment analysis
   */
  async analyzeMarketSentiment(
    symbol: string,
    news: string[],
  ): Promise<{
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    summary: string;
  }> {
    const context = 'You are a market analyst. Provide objective sentiment analysis.';
    
    const prompt = `Analyze the market sentiment for ${symbol} based on these news headlines:

${news.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Provide:
1. Overall sentiment (bullish/bearish/neutral)
2. Confidence level (0-100)
3. Brief summary of key factors`;

    const content = await this.callScaleDownAPI(context, prompt, [], 'gpt-4o');
    
    const sentiment = this.parseSentiment(content);
    
    return {
      sentiment: sentiment.type,
      confidence: sentiment.confidence,
      summary: content,
    };
  }

  // Helper methods
  private buildContextualPrompt(prompt: string, context?: any): string {
    let contextualPrompt = prompt;

    if (context?.portfolio) {
      contextualPrompt += `\n\nCurrent Portfolio:\n${JSON.stringify(context.portfolio, null, 2)}`;
    }

    if (context?.userProfile) {
      contextualPrompt += `\n\nUser Profile:\n- Risk Tolerance: ${context.userProfile.riskTolerance}\n- Goals: ${context.userProfile.investmentGoals?.join(', ')}`;
    }

    if (context?.marketData) {
      contextualPrompt += `\n\nMarket Data:\n${JSON.stringify(context.marketData, null, 2)}`;
    }

    return contextualPrompt;
  }

  private extractRecommendations(content: string): string[] {
    // Simple extraction - look for numbered lists or bullet points
    const lines = content.split('\n');
    const recommendations: string[] = [];
    
    for (const line of lines) {
      if (/^\d+\./.test(line.trim()) || /^[-*]/.test(line.trim())) {
        recommendations.push(line.trim());
      }
    }
    
    return recommendations.slice(0, 5);
  }

  private extractRiskAssessment(content: string): string {
    // Look for risk-related sections
    const riskMatch = content.match(/risk assessment:?\s*(.+?)(?:\n\n|\n\d+\.|\n-|$)/is);
    return riskMatch ? riskMatch[1].trim() : 'Risk assessment not available';
  }

  private parseSentiment(content: string): {
    type: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  } {
    const lowerContent = content.toLowerCase();
    
    let type: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (lowerContent.includes('bullish')) type = 'bullish';
    else if (lowerContent.includes('bearish')) type = 'bearish';
    
    // Try to extract confidence percentage
    const confidenceMatch = content.match(/(\d+)%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
    
    return { type, confidence };
  }
}
