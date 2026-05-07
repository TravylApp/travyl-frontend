export type BudgetExpenseSource = 'manual' | 'auto-flight' | 'auto-hotel' | 'auto-activity';

export interface BudgetExpense {
  id: string;
  description: string;
  amount: number;
  date?: string;
  source?: BudgetExpenseSource;
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
