-- ==========================================================
--  FuCRM — Schema inicial (Fase 1)
--  Fundação: perfis, territórios, clientes, interações,
--  catálogo, orçamentos, carteira interna e auditoria.
-- ==========================================================

create extension if not exists pg_trgm;      -- busca fuzzy (duplicidade de cliente)

-- ---------- Enums ----------
create type papel_enum            as enum ('representante', 'gestor', 'admin');
create type tipo_pessoa_enum      as enum ('pf', 'pj');
create type tipo_cliente_enum     as enum ('consumidor_final', 'revendedor', 'exportacao', 'produtor_rural');
create type status_atividade_enum as enum ('ativo', 'inativo');
create type canal_enum            as enum ('visita', 'telefone', 'whatsapp', 'email', 'outro');
create type tipo_interacao_enum   as enum ('primeira_demonstracao', 'follow_up', 'negociacao', 'pos_venda', 'ocorrencia', 'outro');
create type recepcao_enum         as enum ('boa', 'neutra', 'ruim');
create type tipo_frete_enum       as enum ('F', 'CIF');
create type status_orcamento_enum as enum ('rascunho', 'enviado', 'confirmado', 'em_aprovacao', 'aprovado', 'lancado_totvs', 'faturado', 'perdido', 'cancelado');

-- ---------- updated_at helper ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- profiles (extende auth.users) ----------
create table public.profiles (
  id                    uuid primary key references auth.users on delete cascade,
  nome                  text not null,
  email                 text,
  papel                 papel_enum not null default 'representante',
  codigo_vendedor_totvs text,
  telefone              text,
  foto_url              text,
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- papel do usuário logado (usado nas policies de RLS)
create or replace function public.current_papel()
returns papel_enum language sql stable security definer set search_path = public as $$
  select papel from public.profiles where id = auth.uid()
$$;

create or replace function public.is_gestor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_papel() in ('gestor', 'admin'), false)
$$;

-- cria o profile automaticamente quando um usuário nasce no auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'papel')::papel_enum, 'representante')
  );
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- territórios ----------
create table public.territorios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  definicao  jsonb not null default '{}'::jsonb,   -- { estados:[], cidades:[], ceps:[] }
  exclusivo  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.representante_territorios (
  representante_id uuid references public.profiles(id) on delete cascade,
  territorio_id    uuid references public.territorios(id) on delete cascade,
  primary key (representante_id, territorio_id)
);

-- ---------- clientes / prospects ----------
create table public.clientes (
  id                                 uuid primary key default gen_random_uuid(),
  razao_social                       text not null,
  nome_fantasia                      text,
  tipo_pessoa                        tipo_pessoa_enum not null default 'pj',
  cnpj_cpf                           text,
  inscricao_estadual                 text,
  tipo_cliente                       tipo_cliente_enum not null default 'consumidor_final',
  telefone                           text,
  email                              text,
  endereco                           text,
  cidade                             text,
  estado                             text,            -- crítico p/ tributação no TOTVS
  cep                                text,
  matriz_filial                      text not null default 'matriz',
  cliente_pai_id                     uuid references public.clientes(id),
  territorio_id                      uuid references public.territorios(id),
  representante_responsavel_id       uuid references public.profiles(id),
  representante_primeiro_contato_id  uuid references public.profiles(id),
  data_primeiro_registro             timestamptz,     -- atribuição (imutável na prática)
  status_atividade                   status_atividade_enum not null default 'ativo',
  data_ultima_compra                 date,
  bloqueado                          boolean not null default false,   -- carteira interna
  motivo_bloqueio                    text,
  dados_pessoais                     jsonb not null default '{}'::jsonb, -- aniversário, família, interesses
  dados_economicos                   jsonb not null default '{}'::jsonb,
  obs_entorno                        text,
  health_score                       int,
  consentimento_lgpd                 boolean not null default false,
  consentimento_data                 timestamptz,
  origem                             text,
  created_by                         uuid references public.profiles(id),
  created_at                         timestamptz not null default now(),
  updated_at                         timestamptz not null default now()
);
create index idx_clientes_responsavel on public.clientes(representante_responsavel_id);
create index idx_clientes_razao_trgm  on public.clientes using gin (razao_social gin_trgm_ops);
create index idx_clientes_cnpj        on public.clientes(cnpj_cpf);
create trigger trg_clientes_touch before update on public.clientes
  for each row execute function public.touch_updated_at();

-- ---------- interações (histórico de contato) ----------
create table public.interacoes (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  representante_id  uuid references public.profiles(id),
  data              timestamptz not null default now(),
  canal             canal_enum not null default 'visita',
  tipo              tipo_interacao_enum not null default 'follow_up',
  resumo            text,
  recepcao          recepcao_enum,
  obs_entorno       text,
  dados_economicos  jsonb,
  proxima_acao      text,
  proxima_acao_data date,
  created_at        timestamptz not null default now()
);
create index idx_interacoes_cliente on public.interacoes(cliente_id);

-- ---------- catálogo de produtos (código inteligente) ----------
create table public.produtos (
  id                uuid primary key default gen_random_uuid(),
  codigo_inteligente text unique,
  tipo              text,
  comprimento_mm    int,
  largura_mm        int,
  altura_mm         int,
  referencia_pai_id uuid references public.produtos(id),  -- tampa -> caixa
  linha             text,
  descricao         text,
  unidade           text not null default 'un',
  peso_bruto_kg     numeric,
  ncm               text,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.tabela_precos (
  id             uuid primary key default gen_random_uuid(),
  produto_id     uuid not null references public.produtos(id) on delete cascade,
  regiao_estado  text,
  preco          numeric not null,
  vigencia_inicio date not null default current_date,
  created_at     timestamptz not null default now()
);

-- ---------- orçamentos ----------
create table public.orcamentos (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint generated always as identity,
  cliente_id        uuid not null references public.clientes(id),
  representante_id  uuid references public.profiles(id),
  status            status_orcamento_enum not null default 'rascunho',
  filial            text not null default '030201',
  condicao_pagamento text,
  tipo_frete        tipo_frete_enum not null default 'F',
  valor_frete       numeric,
  peso_bruto_total  numeric,
  obs_pedido        text,
  obs_nota_fiscal   text,
  codigo_vendedor   text,
  valor_total       numeric not null default 0,
  motivo_perda      text,
  aprovado_por      uuid references public.profiles(id),
  aprovado_em       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_orcamentos_rep on public.orcamentos(representante_id);
create trigger trg_orcamentos_touch before update on public.orcamentos
  for each row execute function public.touch_updated_at();

create table public.orcamento_itens (
  id                 uuid primary key default gen_random_uuid(),
  orcamento_id       uuid not null references public.orcamentos(id) on delete cascade,
  produto_id         uuid references public.produtos(id),
  codigo_inteligente text,
  descricao          text,
  quantidade         numeric not null default 1,
  valor_unitario     numeric not null default 0,
  desconto           numeric not null default 0,
  subtotal           numeric generated always as ((quantidade * valor_unitario) - desconto) stored
);
create index idx_itens_orcamento on public.orcamento_itens(orcamento_id);

-- ---------- carteira interna (lista de bloqueio) ----------
create table public.carteira_interna (
  id                 uuid primary key default gen_random_uuid(),
  cnpj_cpf           text,
  razao_social       text,
  motivo             text,
  responsavel_interno text,
  created_at         timestamptz not null default now()
);

-- ---------- auditoria ----------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id),
  acao        text,
  entidade    text,
  entidade_id text,
  dados       jsonb,
  created_at  timestamptz not null default now()
);
