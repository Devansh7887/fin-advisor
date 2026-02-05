'use client';

import { useState, useEffect } from 'react';
import { chartPatternsAPI, portfolioAPI } from '@/lib/api';
import { TrendingUp, TrendingDown, AlertTriangle, Check, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import axios from 'axios';

interface PatternAlert {
  _id: string;
  symbol: string;
  pattern: string;
  confidence: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
  targetPrice?: number;
  stopLoss?: number;
  detectedAt: string;
  read: boolean;
}

interface PriceData {
  date: string;
  close: number;
  high: number;
  low: number;
}

export default function ChartPatternsPage() {
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [portfolioSymbols, setPortfolioSymbols] = useState<string[]>([]);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [chartData, setChartData] = useState<Record<string, PriceData[]>>({});
  const [loadingCharts, setLoadingCharts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPortfolioSymbols();
    fetchAlerts();
  }, []);

  const fetchPortfolioSymbols = async () => {
    try {
      const response = await portfolioAPI.getPortfolios();
      console.log('Portfolio response:', response);
      
      const portfolios = response.data || response;
      
      if (!portfolios || !Array.isArray(portfolios)) {
        console.warn('No portfolios found or invalid response');
        setPortfolioSymbols([]);
        return;
      }
      
      const symbols = portfolios.flatMap((p: any) => 
        p.holdings?.map((h: any) => h.symbol) || []
      );
      const uniqueSymbols = [...new Set(symbols)] as string[];
      console.log('Extracted symbols:', uniqueSymbols);
      setPortfolioSymbols(uniqueSymbols);
    } catch (error) {
      console.error('Failed to fetch portfolio symbols:', error);
      setPortfolioSymbols([]);
    }
  };

  const analyzeAllHoldings = async () => {
    if (portfolioSymbols.length === 0) {
      alert('No portfolio holdings found. Add stocks to your portfolio first.');
      return;
    }
    setAnalyzing(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const sym of portfolioSymbols) {
        try {
          console.log(`Analyzing ${sym}...`);
          await chartPatternsAPI.analyzePattern(sym);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`Failed to analyze ${sym}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Analysis complete: ${successCount} succeeded, ${errorCount} failed`);
      await fetchAlerts();
      
      if (successCount > 0) {
        alert(`✅ Analyzed ${successCount} holdings! Patterns with >30% confidence are shown below.`);
      } else {
        alert(`⚠️ Analysis completed but encountered errors. Check console for details.`);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await chartPatternsAPI.getAlerts();
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;

    setAnalyzing(true);
    try {
      await chartPatternsAPI.analyzePattern(symbol.toUpperCase());
      setSymbol('');
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to analyze pattern:', error);
      alert('Failed to analyze pattern');
    } finally {
      setAnalyzing(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await chartPatternsAPI.markAsRead(id);
      setAlerts(alerts.map(a => a._id === id ? { ...a, read: true } : a));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      await chartPatternsAPI.deleteAlert(id);
      setAlerts(alerts.filter(a => a._id !== id));
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const toggleChart = async (alertId: string, symbol: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
      setExpandedAlerts(newExpanded);
    } else {
      newExpanded.add(alertId);
      setExpandedAlerts(newExpanded);
      
      if (!chartData[symbol]) {
        setLoadingCharts(new Set(loadingCharts).add(symbol));
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `http://localhost:3001/market-data/historical/${symbol}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { period: '6mo', interval: '1d' }
            }
          );
          
          const priceData = response.data.map((item: any) => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            close: item.close,
            high: item.high,
            low: item.low,
          }));
          
          setChartData({ ...chartData, [symbol]: priceData });
        } catch (error) {
          console.error(`Failed to load chart data for ${symbol}:`, error);
        } finally {
          const newLoading = new Set(loadingCharts);
          newLoading.delete(symbol);
          setLoadingCharts(newLoading);
        }
      }
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return 'bg-green-50 border-green-200';
      case 'bearish':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chart Pattern Recognition</h1>
          <p className="text-gray-600">AI-powered technical analysis detecting bullish and bearish patterns</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Analyze Chart Patterns</h2>
          
          <button
            onClick={analyzeAllHoldings}
            disabled={analyzing || portfolioSymbols.length === 0}
            className="w-full mb-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing Portfolio...' : `Analyze All Holdings (${portfolioSymbols.length} stocks)`}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or analyze specific symbol</span>
            </div>
          </div>

          <form onSubmit={analyzePattern} className="flex gap-4 mt-4">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Enter symbol (e.g., AAPL)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={analyzing || !symbol}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-2">
            AI will analyze 6 months of historical data to detect patterns like Head & Shoulders, Cup & Handle, Triangles, and more.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Pattern Alerts</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No pattern alerts found</p>
              <p className="text-sm text-gray-500 mt-2">
                Click "Analyze All Holdings" above or enter a symbol to detect chart patterns
              </p>
              <p className="text-xs text-gray-400 mt-3">
                💡 Tip: Patterns with confidence &gt;30% will appear here. At minimum, you'll see trend analysis for each stock.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`border rounded-lg p-4 ${getSignalColor(alert.signal)} ${
                    !alert.read ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSignalIcon(alert.signal)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{alert.symbol}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.signal === 'bullish' ? 'bg-green-200 text-green-800' :
                            alert.signal === 'bearish' ? 'bg-red-200 text-red-800' :
                            'bg-yellow-200 text-yellow-800'
                          }`}>
                            {alert.signal.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                            {alert.confidence}% confidence
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-2">{alert.pattern}</h4>
                        <p className="text-gray-700 mb-3">{alert.description}</p>
                        
                        <div className="flex gap-4 text-sm mb-3">
                          {alert.targetPrice && (
                            <div>
                              <span className="text-gray-600">Target: </span>
                              <span className="font-semibold text-green-700">${alert.targetPrice.toFixed(2)}</span>
                            </div>
                          )}
                          {alert.stopLoss && (
                            <div>
                              <span className="text-gray-600">Stop Loss: </span>
                              <span className="font-semibold text-red-700">${alert.stopLoss.toFixed(2)}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => toggleChart(alert._id, alert.symbol)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium mb-2"
                        >
                          {expandedAlerts.has(alert._id) ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide Chart
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Show Chart
                            </>
                          )}
                        </button>

                        {expandedAlerts.has(alert._id) && (
                          <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                            {loadingCharts.has(alert.symbol) ? (
                              <div className="flex items-center justify-center h-64">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                              </div>
                            ) : chartData[alert.symbol] ? (
                              <div>
                                <h5 className="font-semibold text-gray-900 mb-3">
                                  6-Month Price Chart - {alert.symbol}
                                </h5>
                                <ResponsiveContainer width="100%" height={300}>
                                  <LineChart data={chartData[alert.symbol]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis 
                                      dataKey="date" 
                                      tick={{ fontSize: 12 }}
                                      interval={Math.floor(chartData[alert.symbol].length / 8)}
                                    />
                                    <YAxis 
                                      domain={['auto', 'auto']}
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                                    />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                      }}
                                      formatter={(value: any) => [`$${value.toFixed(2)}`, 'Price']}
                                    />
                                    {alert.targetPrice && (
                                      <ReferenceLine 
                                        y={alert.targetPrice} 
                                        stroke="#10b981" 
                                        strokeDasharray="3 3"
                                        label={{ value: 'Target', fill: '#10b981', fontSize: 12 }}
                                      />
                                    )}
                                    {alert.stopLoss && (
                                      <ReferenceLine 
                                        y={alert.stopLoss} 
                                        stroke="#ef4444" 
                                        strokeDasharray="3 3"
                                        label={{ value: 'Stop Loss', fill: '#ef4444', fontSize: 12 }}
                                      />
                                    )}
                                    <Line 
                                      type="monotone" 
                                      dataKey="close" 
                                      stroke={alert.signal === 'bullish' ? '#10b981' : alert.signal === 'bearish' ? '#ef4444' : '#f59e0b'}
                                      strokeWidth={2}
                                      dot={false}
                                      activeDot={{ r: 4 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                                <div className="mt-2 text-xs text-gray-500 flex gap-4">
                                  <div className="flex items-center gap-1">
                                    <div className={`w-3 h-0.5 ${alert.signal === 'bullish' ? 'bg-green-500' : alert.signal === 'bearish' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                    <span>Price</span>
                                  </div>
                                  {alert.targetPrice && (
                                    <div className="flex items-center gap-1">
                                      <div className="w-3 h-0.5 bg-green-500 border-dashed"></div>
                                      <span>Target Price</span>
                                    </div>
                                  )}
                                  {alert.stopLoss && (
                                    <div className="flex items-center gap-1">
                                      <div className="w-3 h-0.5 bg-red-500 border-dashed"></div>
                                      <span>Stop Loss</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 py-8">
                                Failed to load chart data
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">
                          Detected: {new Date(alert.detectedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {!alert.read && (
                        <button
                          onClick={() => markAsRead(alert._id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-5 h-5 text-gray-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteAlert(alert._id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Delete alert"
                      >
                        <Trash2 className="w-5 h-5 text-gray-600" />
                      </button>
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
