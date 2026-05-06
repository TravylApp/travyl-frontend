export interface BudgetExpense {
  id: string;
  description: string;
  amount: number;
  date?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  fixed: boolean;
  expenses?: BudgetExpense[];
}

export type HealthState = 'under' | 'warn' | 'over';
