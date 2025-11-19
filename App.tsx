import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BudgetDisplay } from './components/BudgetDisplay';
import { generateBudgetPlan } from './services/geminiService';
import { BudgetPlan, LoadingState } from './types';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateBudget = async (description: string, income: string) => {
    setLoadingState(LoadingState.LOADING);
    setError(null);
    
    try {
      const plan = await generateBudgetPlan(description, income);
      setBudgetPlan(plan);
      setLoadingState(LoadingState.SUCCESS);
    } catch (err) {
      console.error(err);
      setError("We couldn't generate the budget. Please check your connection or try providing more specific details.");
      setLoadingState(LoadingState.ERROR);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Smart Budgeting for Rwanda</h2>
            <p className="text-lg text-gray-600">
              Enter your expenses in plain text. Our AI estimates costs in RWF and builds a weekly & monthly plan for you.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <InputForm onSubmit={handleGenerateBudget} isLoading={loadingState === LoadingState.LOADING} />
          </div>

          {loadingState === LoadingState.ERROR && error && (
            <div className="max-w-3xl mx-auto bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {loadingState === LoadingState.SUCCESS && budgetPlan && (
            <div id="results">
                <BudgetDisplay plan={budgetPlan} />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} KigaliBudget. Powered by Gemini 2.5 Flash.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;