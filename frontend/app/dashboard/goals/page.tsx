"use client";

import { useState, useEffect } from "react";
import { goalsAPI } from "@/lib/api";
import {
  Target,
  Plus,
  Trash2,
  TrendingUp,
  Calendar,
  DollarSign,
  PieChart,
  Eye,
} from "lucide-react";
import GoalDetails from "./GoalDetails";

interface Goal {
  _id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  progress: number;
  onTrack: boolean;
  suggestedAllocation: {
    assetClass: string;
    percentage: number;
    reasoning: string;
  }[];
  milestones: {
    date: string;
    targetAmount: number;
    achieved: boolean;
  }[];
  aiRecommendations: string;
  createdAt: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetAmount: "",
    currentAmount: "",
    targetDate: "",
    riskTolerance: "moderate" as "conservative" | "moderate" | "aggressive",
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await goalsAPI.getGoals();
      setGoals(response.data);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (!formData.name || !formData.targetAmount || !formData.targetDate) {
      alert(
        "Please fill in all required fields (Name, Target Amount, Target Date)",
      );
      return;
    }

    console.log("Creating goal with data:", formData);

    try {
      const goalData = {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount) || 0,
      };

      console.log("Sending goal data to API:", goalData);
      const response = await goalsAPI.createGoal(goalData);
      console.log("Goal created successfully:", response.data);

      setFormData({
        name: "",
        description: "",
        targetAmount: "",
        currentAmount: "",
        targetDate: "",
        riskTolerance: "moderate",
      });
      setShowCreateForm(false);
      await fetchGoals();
      alert(
        "Goal created successfully! AI recommendations have been generated.",
      );
    } catch (error: any) {
      console.error("Failed to create goal:", error);
      console.error("Error details:", error.response?.data);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create goal";
      alert(`Error: ${errorMsg}`);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await goalsAPI.deleteGoal(id);
      setGoals(goals.filter((g) => g._id !== id));
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Investment Goals
            </h1>
            <p className="text-gray-600">
              Set financial goals with AI-powered asset allocation
              recommendations
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Goal
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Goal</h2>
            <form onSubmit={createGoal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Retirement Fund"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Amount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAmount: e.target.value })
                    }
                    placeholder="500000"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Amount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.currentAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentAmount: e.target.value,
                      })
                    }
                    placeholder="50000"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risk Tolerance
                  </label>
                  <select
                    value={formData.riskTolerance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        riskTolerance: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Additional details about your goal..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Goals List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading goals...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No goals yet</p>
            <p className="text-sm text-gray-500">
              Create your first investment goal to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <div
                key={goal._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <Target
                      className={`w-6 h-6 mt-1 ${goal.onTrack ? "text-green-500" : "text-yellow-500"}`}
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {goal.name}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal._id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progress
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round(goal.progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${goal.onTrack ? "bg-green-500" : "bg-yellow-500"}`}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-gray-900">
                      ${goal.currentAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Current</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-900">
                      ${goal.targetAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-blue-600">Target</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-purple-900">
                      {new Date(goal.targetDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-purple-600">Due Date</div>
                  </div>
                </div>

                {/* AI Recommendations */}
                {goal.aiRecommendations && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">
                          AI Recommendations
                        </h4>
                        <p className="text-sm text-blue-800">
                          {goal.aiRecommendations}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Allocation */}
                {goal.suggestedAllocation &&
                  goal.suggestedAllocation.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <PieChart className="w-5 h-5 text-gray-700" />
                        <h4 className="font-medium text-gray-900">
                          Suggested Allocation
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {goal.suggestedAllocation.map((allocation, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {allocation.assetClass}
                                </span>
                                <span className="text-sm font-bold text-gray-900">
                                  {allocation.percentage}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">
                                {allocation.reasoning}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* View Details Button */}
                <button
                  onClick={() => setSelectedGoalId(goal._id)}
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details & Track Progress
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Goal Details Modal */}
        {selectedGoalId && (
          <GoalDetails
            goalId={selectedGoalId}
            onClose={() => setSelectedGoalId(null)}
            onUpdate={fetchGoals}
          />
        )}
      </div>
    </div>
  );
}
