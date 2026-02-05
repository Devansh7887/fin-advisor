"use client";

import { useState, useEffect } from "react";
import { goalsAPI } from "@/lib/api";
import {
  X,
  DollarSign,
  TrendingUp,
  Calendar,
  Plus,
  Target,
  PieChart,
  Lightbulb,
} from "lucide-react";

interface GoalDetailsProps {
  goalId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function GoalDetails({
  goalId,
  onClose,
  onUpdate,
}: GoalDetailsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contributionAmount, setContributionAmount] = useState("");
  const [addingContribution, setAddingContribution] = useState(false);
  const [syncingProfit, setSyncingProfit] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [goalId]);

  const fetchInsights = async () => {
    try {
      const response = await goalsAPI.getGoalInsights(goalId);
      setInsights(response.data);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setAddingContribution(true);
    try {
      await goalsAPI.addContribution(goalId, {
        amount: parseFloat(contributionAmount),
      });
      setContributionAmount("");
      await fetchInsights();
      onUpdate();
      alert("Contribution added successfully!");
    } catch (error) {
      console.error("Failed to add contribution:", error);
      alert("Failed to add contribution. Please try again.");
    } finally {
      setAddingContribution(false);
    }
  };

  const syncPortfolioProfit = async () => {
    setSyncingProfit(true);
    try {
      const response = await goalsAPI.syncPortfolioProfit(goalId);
      await fetchInsights();
      onUpdate();
      alert("Portfolio profits synced successfully!");
    } catch (error) {
      console.error("Failed to sync portfolio profit:", error);
      alert("Failed to sync portfolio profit. Please try again.");
    } finally {
      setSyncingProfit(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Goal Insights & Recommendations
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Progress Overview
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Current Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {insights.progress?.toFixed(1)}%
                </p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(insights.progress, 100)}%` }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Days Remaining</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights.daysRemaining}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ~{Math.round(insights.daysRemaining / 30)} months
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600">Amount Remaining</p>
                <p className="text-2xl font-bold text-green-600">
                  ${insights.amountRemaining?.toLocaleString()}
                </p>
                <p
                  className={`text-sm mt-1 ${insights.onTrack ? "text-green-600" : "text-orange-600"}`}
                >
                  {insights.onTrack ? "✓ On Track" : "⚠ Behind Schedule"}
                </p>
              </div>
            </div>
          </div>

          {/* Add Contribution */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Track Your Progress
            </h3>
            <form onSubmit={addContribution} className="flex gap-3 mb-4">
              <input
                type="number"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                placeholder="Enter contribution amount"
                step="0.01"
                min="0"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
              <button
                type="submit"
                disabled={addingContribution}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
              >
                {addingContribution ? "Adding..." : "Add Contribution"}
              </button>
            </form>
            <button
              onClick={syncPortfolioProfit}
              disabled={syncingProfit}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              {syncingProfit ? "Syncing..." : "Sync Portfolio Profits to Goal"}
            </button>
            <p className="text-sm text-gray-600 mt-3">
              💡 Recommended monthly: $
              {insights.requiredMonthlyContribution?.toLocaleString()}
            </p>
          </div>

          {/* Asset Allocation */}
          {insights.suggestedAllocation && (
            <div className="bg-purple-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                Recommended Asset Allocation
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {insights.suggestedAllocation.map(
                  (allocation: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold capitalize">
                          {allocation.assetClass}
                        </p>
                        <p className="text-2xl font-bold text-purple-600">
                          {allocation.percentage}%
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        {allocation.reasoning}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Stock Recommendations */}
          {insights.stockRecommendations &&
            insights.stockRecommendations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Specific Stock Recommendations
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Based on your risk tolerance and remaining amount ($
                  {insights.amountRemaining?.toLocaleString()}), here are
                  specific stocks to consider:
                </p>
                <div className="space-y-3">
                  {insights.stockRecommendations.map(
                    (stock: any, index: number) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg p-4 border-l-4 border-blue-600"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-bold text-lg">
                                {stock.symbol}
                              </p>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {stock.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium mb-1">
                              {stock.name}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              {stock.reason}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600">Recommended</p>
                            <p className="text-xl font-bold text-green-600">
                              ${stock.recommendedAmount?.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stock.percentageOfTotal}% of total
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>💡 Investment Strategy:</strong>{" "}
                    {insights.aiRecommendations}
                  </p>
                </div>
              </div>
            )}

          {/* Projected Completion */}
          {insights.projectedCompletion && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Projected completion date:{" "}
                <strong>
                  {new Date(insights.projectedCompletion).toLocaleDateString()}
                </strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
