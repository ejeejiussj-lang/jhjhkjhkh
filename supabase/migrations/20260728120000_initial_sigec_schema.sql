create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text default 'Administrador',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

drop policy if exists "Usuarios autenticados leem perfis" on public.profiles;
create policy "Usuarios autenticados leem perfis"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Usuario cria proprio perfil" on public.profiles;
create policy "Usuario cria proprio perfil"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Usuario edita proprio perfil" on public.profiles;
create policy "Usuario edita proprio perfil"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.contracts (
  id text primary key,
  contract_num text not null,
  creditor text not null,
  object text,
  contract_link text,
  start_date text,
  end_date text,
  total_value numeric default 0,
  used_value numeric default 0,
  status text default 'Ativo',
  category text,
  fiscal_name text,
  fiscal_portaria text,
  fiscal_portaria_publication_date text,
  fiscal_portaria_validity text,
  items jsonb default '[]'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.creditors (
  id text primary key,
  cnpj text not null,
  name text not null,
  category text,
  active_contracts_count int default 0,
  total_value numeric default 0,
  status text default 'Ativo',
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.service_notes (
  id text primary key,
  note_number text not null,
  contract_num text,
  creditor text not null,
  issue_date text,
  attestation_date text,
  fiscal_name text,
  value numeric default 0,
  status text default 'Pendente',
  budget_allocation text,
  program text,
  commitment_number text,
  commitment_value numeric default 0,
  commitment_balance numeric default 0,
  current_balance numeric default 0,
  commitment_id text,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.fiscais (
  id text primary key,
  name text not null,
  portaria text not null,
  publication_date text,
  validity text,
  organ text,
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.contract_amendments (
  id text primary key,
  amendment_num text not null,
  amendment_link text,
  contract_num text not null,
  creditor text not null,
  type text not null,
  value_change numeric default 0,
  new_end_date text,
  signature_date text,
  publication_date text,
  justification text,
  status text default 'Vigente',
  created_by uuid default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.contracts enable row level security;
alter table public.creditors enable row level security;
alter table public.service_notes enable row level security;
alter table public.fiscais enable row level security;
alter table public.contract_amendments enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['contracts', 'creditors', 'service_notes', 'fiscais', 'contract_amendments']
  loop
    execute format('drop policy if exists "Usuarios autenticados leem %I" on public.%I', table_name, table_name);
    execute format('create policy "Usuarios autenticados leem %I" on public.%I for select to authenticated using (true)', table_name, table_name);

    execute format('drop policy if exists "Usuarios autenticados criam %I" on public.%I', table_name, table_name);
    execute format('create policy "Usuarios autenticados criam %I" on public.%I for insert to authenticated with check (created_by = auth.uid())', table_name, table_name);

    execute format('drop policy if exists "Criador edita %I" on public.%I', table_name, table_name);
    execute format('create policy "Criador edita %I" on public.%I for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid())', table_name, table_name);

    execute format('drop policy if exists "Criador exclui %I" on public.%I', table_name, table_name);
    execute format('create policy "Criador exclui %I" on public.%I for delete to authenticated using (created_by = auth.uid())', table_name, table_name);
  end loop;
end
$$;