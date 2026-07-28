create table if not exists public.commitments (
  id text primary key,
  number text not null,
  budget_allocation text not null,
  program text not null,
  value numeric default 0,
  balance numeric default 0,
  current_balance numeric default 0,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.commitments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'commitments'
      and policyname = 'Permitir tudo em commitments'
  ) then
    create policy "Permitir tudo em commitments" on public.commitments for all using (true);
  end if;
end
$$;

alter table public.service_notes add column if not exists commitment_id text;
