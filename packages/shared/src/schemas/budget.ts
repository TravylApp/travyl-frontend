import { z } from 'zod';
import type { TripBudgetCategory, TripManualExpense } from '../types';

export const tripBudgetCategorySchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  category: z.string(),
  budgeted: z.number(),
  sort_order: z.number(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

const _bc: TripBudgetCategory = {} as z.infer<typeof tripBudgetCategorySchema>;
void _bc;

export const tripManualExpenseSchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  category_id: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  created_by: z.string(),
  created_at: z.string(),
});

const _me: TripManualExpense = {} as z.infer<typeof tripManualExpenseSchema>;
void _me;

// Inbound — POST budget category
export const createBudgetCategoryBodySchema = z.object({
  trip_id: z.string(),
  category: z.string().min(1).max(100),
  budgeted: z.number().min(0),
  sort_order: z.number().int().default(0),
});
export type CreateBudgetCategoryBody = z.infer<typeof createBudgetCategoryBodySchema>;

// Inbound — POST manual expense
export const createManualExpenseBodySchema = z.object({
  trip_id: z.string(),
  category_id: z.string(),
  description: z.string().min(1).max(200),
  amount: z.number().min(0),
  currency: z.string().default('USD'),
});
export type CreateManualExpenseBody = z.infer<typeof createManualExpenseBodySchema>;
