-- ==========================================================
--  FuCRM — Metas & Ranking
--  Meta por representante, por região (UF) ou geral. Mensal.
-- ==========================================================

create table if not exists public.metas (
  id         uuid primary key default gen_random_uuid(),
  periodo    text not null,                 -- 'YYYY-MM'
  escopo     text not null,                 -- 'representante' | 'regiao' | 'geral'
  alvo       text,                          -- rep uuid | UF | null
  metrica    text not null,                 -- 'faturamento' | 'pedidos' | 'visitas' | 'novos_clientes'
  valor      numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_metas_periodo on public.metas(periodo);

alter table public.metas enable row level security;
create policy metas_select on public.metas for select to authenticated using (true);
create policy metas_manage on public.metas for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

-- Metas de exemplo do mês corrente
insert into public.metas (periodo, escopo, alvo, metrica, valor)
select to_char(now(), 'YYYY-MM'), 'representante', id::text, 'faturamento', 45000 from public.profiles where papel = 'representante';
insert into public.metas (periodo, escopo, alvo, metrica, valor)
select to_char(now(), 'YYYY-MM'), 'representante', id::text, 'visitas', 30 from public.profiles where papel = 'representante';
insert into public.metas (periodo, escopo, alvo, metrica, valor) values
  (to_char(now(), 'YYYY-MM'), 'regiao', 'SC', 'faturamento', 150000),
  (to_char(now(), 'YYYY-MM'), 'regiao', 'RS', 'faturamento', 80000),
  (to_char(now(), 'YYYY-MM'), 'geral', null, 'pedidos', 50);
