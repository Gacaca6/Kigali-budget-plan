import React from 'react';
import { BudgetPlan } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BudgetDisplayProps {
  plan: BudgetPlan;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const BudgetDisplay: React.FC<BudgetDisplayProps> = ({ plan }) => {
  // Format currency helper
  const formatRWF = (amount: number) => {
    return new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount);
  };

  // Prepare data for chart
  const chartData = plan.expenses.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.monthlyTotal;
    } else {
      acc.push({ name: curr.category, value: curr.monthlyTotal });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Summary Card */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 text-teal-900">
        <h3 className="text-lg font-semibold mb-2">Budget Summary</h3>
        <p className="text-teal-800 leading-relaxed">{plan.summary}</p>
        <div className="mt-4 p-4 bg-white rounded-lg border border-teal-100 shadow-sm">
            <p className="font-bold text-teal-700">💡 Savings Tip:</p>
            <p className="text-gray-600 italic">{plan.savingsAdvice}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Weekly Estimate</span>
            <span className="text-3xl font-bold text-gray-900 mt-2">{formatRWF(plan.totalWeekly)}</span>
            <span className="text-xs text-gray-400 mt-1">Expected spend per week</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Monthly Estimate</span>
            <span className="text-3xl font-bold text-emerald-600 mt-2">{formatRWF(plan.totalMonthly)}</span>
            <span className="text-xs text-gray-400 mt-1">Total spend per month</span>
        </div>
      </div>

      {/* Chart and Table Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1 min-h-[300px]">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Expense Distribution</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatRWF(Number(value))} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Detailed Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Cost</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {plan.expenses.map((expense, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{expense.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{expense.item}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatRWF(expense.estimatedCost)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${expense.frequency.toLowerCase().includes('day') ? 'bg-blue-100 text-blue-800' : 
                                          expense.frequency.toLowerCase().includes('week') ? 'bg-purple-100 text-purple-800' : 
                                          'bg-green-100 text-green-800'}`}>
                                        {expense.frequency}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-right">{formatRWF(expense.monthlyTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};