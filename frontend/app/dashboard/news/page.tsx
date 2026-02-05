'use client';

import { useState, useEffect } from 'react';
import { newsAPI, portfolioAPI } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, Newspaper, AlertCircle } from 'lucide-react';

interface NewsArticle {
  _id: string;
  symbol: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  confidence: number;
}

interface SentimentSummary {
  symbol: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  averageScore: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  recentNews: NewsArticle[];
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sentiment, setSentiment] = useState<SentimentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [portfolioSymbols, setPortfolioSymbols] = useState<string[]>([]);

  useEffect(() => {
    fetchPortfolioSymbols();
  }, []);

  const fetchPortfolioSymbols = async () => {
    try {
      const response = await portfolioAPI.getPortfolios();
      console.log('Portfolio response:', response);
      
      // Handle both response.data and direct response
      const portfolios = response.data || response;
      
      if (!portfolios || !Array.isArray(portfolios)) {
        console.warn('No portfolios found or invalid response');
        setPortfolioSymbols([]);
        setLoading(false);
        return;
      }
      
      const symbols = portfolios.flatMap((p: any) => 
        p.holdings?.map((h: any) => h.symbol) || []
      );
      const uniqueSymbols = [...new Set(symbols)] as string[];
      console.log('Extracted symbols:', uniqueSymbols);
      setPortfolioSymbols(uniqueSymbols);
      
      // Auto-load portfolio news on page load
      if (uniqueSymbols.length > 0) {
        setLoading(true);
        try {
          const response = await newsAPI.getNewsByPortfolio(uniqueSymbols);
          setNews(response.data);
        } catch (error) {
          console.error('Failed to fetch portfolio news:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio symbols:', error);
      setPortfolioSymbols([]);
      setLoading(false);
    }
  };

  const fetchNewsBySymbol = async (sym: string) => {
    setLoading(true);
    try {
      // First analyze/fetch news (this will fetch and save to DB)
      await newsAPI.analyzeNews(sym);
      
      // Then fetch the analyzed news and sentiment
      const [newsRes, sentimentRes] = await Promise.all([
        newsAPI.getNewsBySymbol(sym),
        newsAPI.getSentimentSummary(sym)
      ]);
      setNews(newsRes.data);
      setSentiment(sentimentRes.data);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      alert('Failed to fetch news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioNews = async () => {
    if (portfolioSymbols.length === 0) {
      alert('No portfolio holdings found');
      return;
    }
    setLoading(true);
    try {
      // First analyze/fetch news for all symbols
      await Promise.all(
        portfolioSymbols.map(symbol => newsAPI.analyzeNews(symbol))
      );
      
      // Then fetch all analyzed news
      const response = await newsAPI.getNewsByPortfolio(portfolioSymbols);
      setNews(response.data);
      setSentiment(null);
    } catch (error) {
      console.error('Failed to fetch portfolio news:', error);
      alert('Failed to fetch portfolio news');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;
    await fetchNewsBySymbol(symbol.toUpperCase());
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 20) return 'text-green-600 bg-green-50';
    if (score < -20) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">News Sentiment Analysis</h1>
          <p className="text-gray-600">AI-powered sentiment scoring of financial news (-100 to +100)</p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Fetch & Analyze News</h2>
          <p className="text-sm text-gray-600 mb-4">
            📰 Enter a stock symbol to fetch recent news and get AI-powered sentiment analysis
          </p>
          <form onSubmit={handleAnalyzeSymbol} className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Enter symbol (e.g., AAPL, GOOGL, TSLA)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading || !symbol}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? 'Analyzing...' : '🔍 Fetch News'}
              </button>
            </div>
            {portfolioSymbols.length > 0 && (
              <button
                type="button"
                onClick={fetchPortfolioNews}
                disabled={loading}
                className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                📊 Show Portfolio News ({portfolioSymbols.length} holdings)
              </button>
            )}
          </form>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 <strong>How it works:</strong> Click "Fetch News" to get recent articles about any stock. 
              Our AI analyzes each article and assigns a sentiment score from -100 (very bearish) to +100 (very bullish).
            </p>
          </div>
        </div>

        {/* Sentiment Summary */}
        {sentiment && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Sentiment Summary for {sentiment.symbol}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold mb-1">{sentiment.averageScore}</div>
                <div className="text-sm text-gray-600">Average Score</div>
                <div className="mt-2 px-3 py-1 rounded-full text-xs font-medium inline-block bg-gray-200">
                  {sentiment.overallSentiment.toUpperCase()}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-1">{sentiment.bullishCount}</div>
                <div className="text-sm text-gray-600">Bullish Articles</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-1">{sentiment.bearishCount}</div>
                <div className="text-sm text-gray-600">Bearish Articles</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-gray-600 mb-1">{sentiment.neutralCount}</div>
                <div className="text-sm text-gray-600">Neutral Articles</div>
              </div>
            </div>
          </div>
        )}

        {/* News Articles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">News Articles</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading news...</p>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium text-lg mb-2">No News Articles Yet</p>
              <p className="text-gray-500 mb-4">
                Get started by analyzing news for any stock symbol
              </p>
              <div className="max-w-md mx-auto text-left bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2"><strong>Quick Start:</strong></p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Enter a stock symbol (e.g., AAPL, TSLA, MSFT) above</li>
                  <li>Click "🔍 Fetch News" to get recent articles</li>
                  <li>AI will analyze sentiment and show results here</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((article) => (
                <div
                  key={article._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {getSentimentIcon(article.sentiment)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {article.title}
                          </a>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-gray-700">{article.symbol}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{article.source}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{article.description}</p>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(article.sentimentScore)}`}>
                          Score: {article.sentimentScore > 0 ? '+' : ''}{article.sentimentScore}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                          {article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {article.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
