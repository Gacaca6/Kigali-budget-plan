import React, { useState } from 'react';

interface InputFormProps {
  onSubmit: (text: string, income: string) => void;
  isLoading: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [description, setDescription] = useState('');
  const [income, setIncome] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onSubmit(description, income);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Tell us about your spending</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div>
          <label htmlFor="income" className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Income (Optional - in RWF)
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">RWF</span>
            </div>
            <input
              type="text"
              name="income"
              id="income"
              className="block w-full rounded-md border-gray-300 pl-12 py-3 focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border text-gray-900"
              placeholder="e.g. 500,000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Expected Expenses
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Describe your habits. Example: "I pay 150k rent, take a moto daily (1k), eat lunch at work (2k), and buy groceries weekly."
          </p>
          <textarea
            id="description"
            rows={5}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm bg-gray-50 border p-3 text-gray-900"
            placeholder="Type here..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !description}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
            ${isLoading ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500'}
            transition-colors duration-200`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Finances...
            </span>
          ) : (
            "Generate Budget"
          )}
        </button>
      </form>
    </div>
  );
};