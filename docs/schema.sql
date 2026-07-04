-- ScontrinoAI: schema database completo
-- Eseguire nell'SQL Editor di Supabase su un progetto nuovo.

create type public.expense_category as enum (
  'ristorazione', 'trasporti', 'carburante', 'ufficio',
  'hardware_software', 'alloggio', 'utenze', 'altro'
);

create type public.receipt_status as enum (
  'processing', 'completed', 'failed'
);

create table public.receipts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) not null,
  image_path    text not null,
  status        public.receipt_status not null default 'processing',
  merchant      text,
  receipt_date  date,
  total         numeric(10,2),
  vat_amount    numeric(10,2),
  vat_rate      numeric(4,2),
  currency      char(3) default 'EUR',
  category      public.expense_category,
  line_items    jsonb,
  raw_extraction jsonb,
  attempts       int not null default 0,
  model_used     text,
  confidence     text,
  error_log      jsonb,
  created_at    timestamptz not null default now()
);

create index idx_receipts_user_date on public.receipts (user_id, receipt_date desc);
create index idx_receipts_category  on public.receipts (user_id, category);

alter table public.receipts enable row level security;

create policy "own receipts" on public.receipts
  for all using (auth.uid() = user_id);

-- Permessi API (necessari se "Automatically expose new tables" è disattivato)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.receipts to authenticated;
notify pgrst, 'reload schema';

-- Storage: creare un bucket PRIVATO chiamato "receipts", poi:
create policy "users upload own receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users read own receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users delete own receipts" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);