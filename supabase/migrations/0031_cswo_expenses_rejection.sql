-- Phase 5 Add Expense Rejection: Status enum additions and rejection_reason column
ALTER TYPE public.cswo_expense_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TABLE public.cswo_expenses ADD COLUMN IF NOT EXISTS rejection_reason text;
