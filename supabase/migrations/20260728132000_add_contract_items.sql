alter table public.contracts
add column if not exists items jsonb default '[]'::jsonb;
