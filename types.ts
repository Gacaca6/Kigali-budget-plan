export interface ExpenseItem {
  category: string;
  item: string;
  estimatedCost: number; // In RWF
  frequency: string; // Daily, Weekly, Monthly, One-time
  monthlyTotal: number; // Calculated monthly cost
}

export interface BudgetPlan {
  expenses: ExpenseItem[];
  totalMonthly: number;
  totalWeekly: number;
  savingsAdvice: string;
  summary: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}