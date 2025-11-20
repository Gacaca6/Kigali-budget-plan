import React from 'react';
import { SavedBudget } from '../types';

interface BudgetHistoryProps {
  budgets: SavedBudget[];
  onSelect: (budget: SavedBudget) => void;
  onDelete: (id: string) => void;
}

export const BudgetHistory: React.FC<BudgetHistoryProps> = ({ budgets, onSelect, onDelete }) => {
  if (budgets.length === 0) return null;

  const formatRWF = (amount: number) => {
    return new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Saved Budgets</h3>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
          {budgets.length} saved
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-1">
        {budgets.map((budget) => (
          <div key={budget.id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all duration-200">
            <div className="flex-grow cursor-pointer" onClick={() => onSelect(budget)}>
              <div className="flex justify-between items-start">
                <div>
                   <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">
                    {new Date(budget.timestamp).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-1">{budget.plan.summary.substring(0, 60)}...</p>
                </div>
                <p className="font-bold text-teal-700 text-lg ml-4 whitespace-nowrap">
                  {formatRWF(budget.plan.totalMonthly)}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(budget.id); }}
              className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              title="Delete"
              aria-label="Delete budget"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};