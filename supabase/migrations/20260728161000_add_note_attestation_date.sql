alter table public.service_notes
add column if not exists attestation_date text;

alter table public.service_notes
add column if not exists fiscal_name text;
