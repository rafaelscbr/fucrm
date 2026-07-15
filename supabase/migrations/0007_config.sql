-- ==========================================================
--  FuCRM — Configuração: dados da empresa (Fuplastic) e
--  condições de pagamento gerenciáveis pelo admin.
-- ==========================================================

-- Dados internos da Fuplastic (linha única) — saem no PDF do orçamento.
create table if not exists public.empresa_config (
  id         int primary key default 1,
  nome       text,
  fantasia   text,
  cnpj       text,
  ie         text,
  endereco   text,
  telefone   text,
  email      text,
  site       text,
  filial     text default '030201',
  updated_at timestamptz not null default now(),
  constraint empresa_single check (id = 1)
);
insert into public.empresa_config (id, nome, fantasia, cnpj, ie, endereco, telefone, email, site, filial)
values (1, 'Fuplastic Indústria e Comércio de Plásticos Ltda', 'FUPLASTIC', '', '', 'Cotia — SP', '', 'comercial@fuplastic.com.br', 'fuplastic.com.br', '030201')
on conflict (id) do nothing;

alter table public.empresa_config enable row level security;
create policy empresa_select on public.empresa_config for select to authenticated using (true);
create policy empresa_update on public.empresa_config for update to authenticated using (public.is_gestor()) with check (public.is_gestor());

-- Condições de pagamento (códigos do TOTVS).
create table if not exists public.condicoes_pagamento (
  id         uuid primary key default gen_random_uuid(),
  codigo     text,
  descricao  text not null,
  ativo      boolean not null default true,
  ordem      int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.condicoes_pagamento enable row level security;
create policy cond_select on public.condicoes_pagamento for select to authenticated using (true);
create policy cond_manage on public.condicoes_pagamento for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

insert into public.condicoes_pagamento (codigo, descricao, ordem) values
  ('001', 'À vista', 1),
  ('007', '28 / 56 dias', 2),
  ('010', '30 / 60 / 90 dias', 3),
  ('015', 'Boleto 30 dias', 4);
