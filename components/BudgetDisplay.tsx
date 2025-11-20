import React, { useState } from 'react';
import { BudgetPlan } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BudgetDisplayProps {
  plan: BudgetPlan;
  onSave?: () => void;
  isSaved?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const BudgetDisplay: React.FC<BudgetDisplayProps> = ({ plan, onSave, isSaved }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Format currency helper
  const formatRWF = (amount: number) => {
    return new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount);
  };

  // Recalculate totals to ensure mathematical accuracy based on the returned items
  const calculatedMonthlyTotal = plan.expenses.reduce((sum, item) => sum + item.monthlyTotal, 0);
  const calculatedWeeklyTotal = calculatedMonthlyTotal / 4; 

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

  const handleDownloadPdf = async () => {
    const element = document.getElementById('budget-print-area');
    if (!element) return;

    setIsDownloading(true);

    try {
      // Access libraries from global window scope (loaded via script tags in index.html)
      const html2canvas = (window as any).html2canvas;
      const jspdfLib = (window as any).jspdf;

      if (!html2canvas || !jspdfLib) {
         throw new Error("PDF libraries not loaded properly.");
      }
      
      const { jsPDF } = jspdfLib;

      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page if content is too long (though simple budget usually fits)
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('KoraBudget_Plan.pdf');
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Actions Toolbar */}
      <div className="flex flex-wrap justify-end gap-3 pb-2">
         <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-white hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-70"
          >
            {isDownloading ? (
               <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating PDF...
              </span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
         </button>

        {onSave && (
            <button 
              onClick={onSave}
              disabled={isSaved}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                isSaved 
                ? 'bg-teal-100 text-teal-800 cursor-default border border-teal-200' 
                : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {isSaved ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Saved to History
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                  </svg>
                  Save Budget
                </>
              )}
            </button>
          )}
      </div>

      {/* Content to Print */}
      <div id="budget-print-area" className="space-y-6 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
        
        {/* PDF Header */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-6">
            <div className="flex items-center space-x-3">
                <div className="bg-teal-600 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">KoraBudget</h2>
                    <p className="text-sm text-gray-500">Your Personal Finance Plan</p>
                </div>
            </div>
            <div className="text-right">
                 <div className="text-sm font-medium text-gray-500">Generated On</div>
                 <div className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</div>
            </div>
        </div>

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
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Weekly Estimate</span>
              <span className="text-3xl font-bold text-gray-900 mt-2">{formatRWF(calculatedWeeklyTotal)}</span>
              <span className="text-xs text-gray-400 mt-1">Average spend per week</span>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Monthly Estimate</span>
              <span className="text-3xl font-bold text-emerald-600 mt-2">{formatRWF(calculatedMonthlyTotal)}</span>
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
                          {/* Total Row */}
                          <tr className="bg-gray-50 font-bold">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={4}>Total Monthly Expenses</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-700 text-right">{formatRWF(calculatedMonthlyTotal)}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
        </div>

        {/* PDF Footer */}
        <div className="pt-8 mt-8 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">
                © 2025 KoraBudget Made By Godwin
            </p>
        </div>

      </div>
    </div>
  );
};