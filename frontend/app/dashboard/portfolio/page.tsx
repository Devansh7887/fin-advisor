"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { portfolioAPI } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Holding {
  symbol: string;
  quantity: number;
  avgCost: string; // Backend sends avgCost as string
  currentPrice: string; // Backend sends as string
  totalValue: string; // Backend sends as string
  gainLoss: string; // Backend sends as string
  gainLossPercentage: number;
}

interface Portfolio {
  _id: string;
  name: string;
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercentage?: number;
  totalGainLossPercent?: number;
  holdings: Holding[];
  createdAt: string;
}

export default function PortfolioPage() {
  const { token } = useAuthStore();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: "",
    quantity: "",
    price: "",
  });
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");

  useEffect(() => {
    loadPortfolios();
  }, [token]);

  const loadPortfolios = async () => {
    try {
      setIsLoading(true);
      console.log("Loading portfolios...");
      const response = await portfolioAPI.getAll();
      console.log("Portfolios loaded successfully:", response.data);
      setPortfolios(response.data);
      if (response.data.length > 0) {
        setSelectedPortfolio(response.data[0]);
      }
    } catch (error: any) {
      console.error("Failed to load portfolios:", error);
      console.error("Error details:", error.response?.data || error.message);
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      alert("Please enter a portfolio name");
      return;
    }

    try {
      console.log("Creating portfolio with name:", newPortfolioName);
      const response = await portfolioAPI.create({ name: newPortfolioName });
      console.log("Portfolio created successfully:", response.data);
      setNewPortfolioName("");
      setShowCreatePortfolio(false);
      await loadPortfolios();
    } catch (error: any) {
      console.error("Failed to create portfolio:", error);
      console.error("Error response:", error.response?.data || error.message);
      console.error("Error status:", error.response?.status);

      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
      } else if (error.response?.data?.message) {
        alert(`Failed to create portfolio: ${error.response.data.message}`);
      } else {
        alert("Failed to create portfolio. Please check console for details.");
      }
    }
  };

  const addHolding = async () => {
    if (
      !selectedPortfolio ||
      !newHolding.symbol ||
      !newHolding.quantity ||
      !newHolding.price
    ) {
      alert("Please fill all fields");
      return;
    }

    try {
      console.log("Adding holding:", newHolding);
      await portfolioAPI.addHolding(selectedPortfolio._id, {
        symbol: newHolding.symbol.toUpperCase(),
        quantity: parseFloat(newHolding.quantity),
        avgCost: parseFloat(newHolding.price),
      });

      setNewHolding({ symbol: "", quantity: "", price: "" });
      setShowAddHolding(false);
      loadPortfolios();
    } catch (error) {
      console.error("Failed to add holding:", error);
      alert("Failed to add holding. Please try again.");
    }
  };

  const removeHolding = async (symbol: string) => {
    if (!selectedPortfolio) return;

    if (confirm(`Remove ${symbol} from portfolio?`)) {
      try {
        await portfolioAPI.removeHolding(selectedPortfolio._id, symbol);
        loadPortfolios();
      } catch (error) {
        console.error("Failed to remove holding:", error);
        alert("Failed to remove holding. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-600 mt-1">
            Manage your investment portfolios
          </p>
        </div>
        <Button onClick={() => setShowCreatePortfolio(true)}>
          + Create Portfolio
        </Button>
      </div>

      {/* Create Portfolio Modal */}
      {showCreatePortfolio && (
        <Card className="p-6 border-2 border-blue-500">
          <h3 className="text-lg font-semibold mb-4">Create New Portfolio</h3>
          <div className="space-y-4">
            <Input
              placeholder="Portfolio Name (e.g., Growth Portfolio)"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && createPortfolio()}
            />
            <div className="flex gap-2">
              <Button onClick={createPortfolio} className="flex-1">
                Create
              </Button>
              <Button
                onClick={() => {
                  setShowCreatePortfolio(false);
                  setNewPortfolioName("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {portfolios.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No Portfolios Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first portfolio to start tracking your investments
            </p>
            <Button onClick={() => setShowCreatePortfolio(true)} size="lg">
              Create Your First Portfolio
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio List */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Your Portfolios</h2>
            <div className="space-y-2">
              {portfolios.map((portfolio) => (
                <div
                  key={portfolio._id}
                  onClick={() => setSelectedPortfolio(portfolio)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedPortfolio?._id === portfolio._id
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="font-semibold">{portfolio.name}</div>
                  <div className="text-2xl font-bold mt-2">
                    $
                    {(portfolio.totalValue || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div
                    className={`text-sm mt-1 ${(portfolio.totalGainLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {(portfolio.totalGainLoss || 0) >= 0 ? "▲" : "▼"}$
                    {Math.abs(portfolio.totalGainLoss || 0).toLocaleString(
                      "en-US",
                      { minimumFractionDigits: 2 },
                    )}
                    (
                    {(
                      portfolio.totalGainLossPercentage ||
                      portfolio.totalGainLossPercent ||
                      0
                    ).toFixed(2)}
                    %)
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Portfolio Details */}
          {selectedPortfolio && (
            <div className="lg:col-span-2 space-y-6">
              {/* Summary Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {selectedPortfolio.name}
                  </h2>
                  <Button onClick={() => setShowAddHolding(!showAddHolding)}>
                    + Add Holding
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-600">Total Value</div>
                    <div className="text-2xl font-bold">
                      $
                      {(selectedPortfolio.totalValue || 0).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2 },
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Gain/Loss</div>
                    <div
                      className={`text-2xl font-bold ${(selectedPortfolio.totalGainLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      $
                      {(selectedPortfolio.totalGainLoss || 0).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2 },
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Return</div>
                    <div
                      className={`text-2xl font-bold ${(selectedPortfolio.totalGainLossPercentage || selectedPortfolio.totalGainLossPercent || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {(
                        selectedPortfolio.totalGainLossPercentage ||
                        selectedPortfolio.totalGainLossPercent ||
                        0
                      ).toFixed(2)}
                      %
                    </div>
                  </div>
                </div>

                {/* Add Holding Form */}
                {showAddHolding && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold mb-3">Add New Holding</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Symbol (e.g., AAPL)"
                        value={newHolding.symbol}
                        onChange={(e) =>
                          setNewHolding({
                            ...newHolding,
                            symbol: e.target.value.toUpperCase(),
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={newHolding.quantity}
                        onChange={(e) =>
                          setNewHolding({
                            ...newHolding,
                            quantity: e.target.value,
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Purchase Price"
                        value={newHolding.price}
                        onChange={(e) =>
                          setNewHolding({
                            ...newHolding,
                            price: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={addHolding} className="flex-1">
                        Add
                      </Button>
                      <Button
                        onClick={() => setShowAddHolding(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Holdings Table */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Holdings</h3>
                {selectedPortfolio.holdings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No holdings yet. Add your first stock!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Symbol</th>
                          <th className="text-right py-3 px-4">Quantity</th>
                          <th className="text-right py-3 px-4">Avg Price</th>
                          <th className="text-right py-3 px-4">
                            Current Price
                          </th>
                          <th className="text-right py-3 px-4">Total Value</th>
                          <th className="text-right py-3 px-4">Gain/Loss</th>
                          <th className="text-right py-3 px-4">Return</th>
                          <th className="text-center py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPortfolio.holdings.map((holding) => (
                          <tr
                            key={holding.symbol}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="py-3 px-4 font-semibold">
                              {holding.symbol}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {holding.quantity || 0}
                            </td>
                            <td className="py-3 px-4 text-right">
                              ${Number(holding.avgCost || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              ${Number(holding.currentPrice || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              $
                              {Number(holding.totalValue || 0).toLocaleString(
                                "en-US",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-semibold ${Number(holding.gainLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              $
                              {Number(holding.gainLoss || 0).toLocaleString(
                                "en-US",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-semibold ${Number(holding.gainLossPercentage || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {Number(holding.gainLossPercentage || 0) >= 0
                                ? "▲"
                                : "▼"}{" "}
                              {Math.abs(
                                Number(holding.gainLossPercentage || 0),
                              ).toFixed(2)}
                              %
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => removeHolding(holding.symbol)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
