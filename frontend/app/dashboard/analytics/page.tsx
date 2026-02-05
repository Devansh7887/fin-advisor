'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { marketDataAPI } from '@/lib/api';

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
}

export default function AnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'GOOGL', 'MSFT', 'TSLA']);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    loadQuotes();
    const interval = setInterval(loadQuotes, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [watchlist]);

  const loadQuotes = async () => {
    try {
      setIsLoading(true);
      const response = await marketDataAPI.getBatch(watchlist);
      setQuotes(response.data);
    } catch (error) {
      console.error('Failed to load quotes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await marketDataAPI.search(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const addToWatchlist = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Market Analytics</h1>
          <p className="text-gray-600 mt-1">Real-time market data and insights</p>
        </div>
      </div>

      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">S&P 500</p>
              <p className="text-2xl font-bold mt-1">4,783.45</p>
            </div>
            <div className="text-right">
              <p className="text-green-600 font-semibold">+1.2%</p>
              <p className="text-sm text-gray-500">+56.78</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">NASDAQ</p>
              <p className="text-2xl font-bold mt-1">14,963.87</p>
            </div>
            <div className="text-right">
              <p className="text-green-600 font-semibold">+1.5%</p>
              <p className="text-sm text-gray-500">+221.45</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">DOW JONES</p>
              <p className="text-2xl font-bold mt-1">37,545.33</p>
            </div>
            <div className="text-right">
              <p className="text-green-600 font-semibold">+0.8%</p>
              <p className="text-sm text-gray-500">+297.81</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Add Stocks to Watchlist</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search for stocks (e.g., AAPL, Tesla, etc.)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((result) => (
              <div
                key={result.symbol}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => addToWatchlist(result.symbol)}
              >
                <div>
                  <p className="font-semibold">{result.symbol}</p>
                  <p className="text-sm text-gray-600">{result.name}</p>
                </div>
                <Button size="sm" variant="outline">
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Watchlist */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Watchlist</h2>
          <Button onClick={loadQuotes} variant="outline" size="sm" disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {isLoading && quotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading market data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Symbol</th>
                  <th className="text-left py-3 px-2">Name</th>
                  <th className="text-right py-3 px-2">Price</th>
                  <th className="text-right py-3 px-2">Change</th>
                  <th className="text-right py-3 px-2">% Change</th>
                  <th className="text-right py-3 px-2">Volume</th>
                  <th className="text-right py-3 px-2">Market Cap</th>
                  <th className="text-right py-3 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.symbol} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-semibold">{quote.symbol}</td>
                    <td className="py-3 px-2 text-gray-600">{quote.name}</td>
                    <td className="py-3 px-2 text-right font-semibold">
                      ${quote.price.toFixed(2)}
                    </td>
                    <td className={`py-3 px-2 text-right ${quote.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                    </td>
                    <td className={`py-3 px-2 text-right font-semibold ${quote.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">
                      {(quote.volume / 1000000).toFixed(2)}M
                    </td>
                    <td className="py-3 px-2 text-right text-gray-600">
                      {formatNumber(quote.marketCap)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromWatchlist(quote.symbol)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Market Sectors */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Market Sectors Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Technology', change: 2.1, color: 'green' },
            { name: 'Healthcare', change: 1.3, color: 'green' },
            { name: 'Finance', change: -0.5, color: 'red' },
            { name: 'Energy', change: 3.2, color: 'green' },
            { name: 'Consumer', change: 0.8, color: 'green' },
            { name: 'Real Estate', change: -1.2, color: 'red' },
            { name: 'Utilities', change: 0.3, color: 'green' },
            { name: 'Materials', change: 1.7, color: 'green' },
          ].map((sector) => (
            <div
              key={sector.name}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <p className="text-sm text-gray-600">{sector.name}</p>
              <p className={`text-xl font-bold mt-1 ${
                sector.color === 'green' ? 'text-green-600' : 'text-red-600'
              }`}>
                {sector.change >= 0 ? '+' : ''}{sector.change}%
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Economic Indicators */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Key Economic Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-gray-600">Interest Rate</p>
            <p className="text-2xl font-bold mt-1">5.25%</p>
            <p className="text-sm text-gray-500 mt-1">Federal Reserve Rate</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-sm text-gray-600">Inflation Rate</p>
            <p className="text-2xl font-bold mt-1">3.2%</p>
            <p className="text-sm text-gray-500 mt-1">Year-over-Year CPI</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="text-sm text-gray-600">Unemployment</p>
            <p className="text-2xl font-bold mt-1">3.7%</p>
            <p className="text-sm text-gray-500 mt-1">U.S. Unemployment Rate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
