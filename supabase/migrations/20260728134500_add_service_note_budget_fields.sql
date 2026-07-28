alter table public.service_notes add column if not exists budget_allocation text;
alter table public.service_notes add column if not exists program text;
alter table public.service_notes add column if not exists commitment_number text;
alter table public.service_notes add column if not exists commitment_value numeric default 0;
alter table public.service_notes add column if not exists commitment_balance numeric default 0;
alter table public.service_notes add column if not exists current_balance numeric default 0;
