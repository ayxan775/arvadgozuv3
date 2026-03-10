ALTER TABLE `transactions` ADD `source_type` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `source_fixed_expense_id` text REFERENCES fixed_expenses(id);--> statement-breakpoint
ALTER TABLE `transactions` ADD `source_month` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `rollback_prev_last_paid_month` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `rollback_prev_last_paid_amount` real;