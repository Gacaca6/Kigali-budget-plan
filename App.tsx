import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { BudgetDisplay } from './components/BudgetDisplay';
import { BudgetHistory } from './components/BudgetHistory';
import { generateBudgetPlan } from './services/geminiService';
import { BudgetPlan, LoadingState, SavedBudget } from './types';

const STORAGE_KEY = 'koraBudget_history';

const App: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);
  const [isCurrentSaved, setIsCurrentSaved] = useState(false);

  // Load history on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedBudgets(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved budgets", e);
      }
    }
  }, []);

  // Save history when state changes (optional, but better to do explicitly in handlers)
  const persistHistory = (budgets: SavedBudget[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  };

  const handleGenerateBudget = async (description: string, income: string) => {
    setLoadingState(LoadingState.LOADING);
    setError(null);
    setBudgetPlan(null);
    setIsCurrentSaved(false);
    
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

  const handleSaveBudget = () => {
    if (!budgetPlan) return;

    const newSavedBudget: SavedBudget = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      plan: budgetPlan
    };

    const updated = [newSavedBudget, ...savedBudgets];
    setSavedBudgets(updated);
    persistHistory(updated);
    setIsCurrentSaved(true);
  };

  const handleDeleteBudget = (id: string) => {
    const updated = savedBudgets.filter(b => b.id !== id);
    setSavedBudgets(updated);
    persistHistory(updated);
  };

  const handleSelectBudget = (saved: SavedBudget) => {
    setBudgetPlan(saved.plan);
    setLoadingState(LoadingState.SUCCESS);
    setIsCurrentSaved(true);
    // Scroll to results
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Input and History */}
            <div className="lg:col-span-1 space-y-8">
              <InputForm onSubmit={handleGenerateBudget} isLoading={loadingState === LoadingState.LOADING} />
              
              {savedBudgets.length > 0 && (
                <BudgetHistory 
                  budgets={savedBudgets} 
                  onSelect={handleSelectBudget}
                  onDelete={handleDeleteBudget}
                />
              )}
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-2">
               {loadingState === LoadingState.IDLE && !budgetPlan && (
                 <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300 text-gray-400">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 text-gray-300">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                   </svg>
                   <p className="text-lg">Your budget plan will appear here</p>
                 </div>
               )}

               {loadingState === LoadingState.ERROR && error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
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

              {budgetPlan && (
                <div id="results">
                    <BudgetDisplay 
                      plan={budgetPlan} 
                      onSave={handleSaveBudget}
                      isSaved={isCurrentSaved}
                    />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} KoraBudget. Made By Godwin
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;