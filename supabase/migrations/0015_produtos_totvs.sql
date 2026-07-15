-- Cadastro de produtos vindo do TOTVS (tabela SB1 do Protheus).
-- Mantém o CÓDIGO e a DESCRIÇÃO originais do TOTVS e absorve os campos que
-- impactam precificação e o fluxo orçamento → lançar TOTVS (fiscais, peso, unidade).
-- Preço NÃO vem neste export (virá de planilha à parte) → tabela_precos fica p/ isso.

alter table public.produtos add column if not exists codigo_totvs      text;    -- SB1 "Codigo" (chave de negócio)
alter table public.produtos add column if not exists tipo_totvs        text;    -- PA/MP/MC/PI/SV/EM/MO/AI/BN/GG/OI/PV
alter table public.produtos add column if not exists grupo_totvs       text;    -- SB1 "Grupo"
alter table public.produtos add column if not exists filial            text;    -- SB1 "Filial"
alter table public.produtos add column if not exists cest              text;    -- fiscal ST
alter table public.produtos add column if not exists origem_fiscal     text;    -- 0=nacional, 1..8
alter table public.produtos add column if not exists grupo_tributario  text;    -- SB1 "Grupo Trib."
alter table public.produtos add column if not exists especie_tipi      text;
alter table public.produtos add column if not exists aliq_icms         numeric; -- ⚠ pouco confiável no SB1 (tributação real vem do NCM+TES)
alter table public.produtos add column if not exists aliq_ipi          numeric; -- ⚠ idem
alter table public.produtos add column if not exists peso_liquido_kg   numeric;
alter table public.produtos add column if not exists segunda_unidade   text;    -- SB1 "Seg.Un.Medi."
alter table public.produtos add column if not exists fator_conversao   numeric; -- 2ª unidade -> 1ª
alter table public.produtos add column if not exists bloqueado         boolean not null default false;

-- Campo original do TOTVS é único quando presente.
create unique index if not exists produtos_codigo_totvs_key
  on public.produtos (codigo_totvs) where codigo_totvs is not null;

-- Buscas do orçamento (código / descrição / NCM).
create index if not exists produtos_busca_idx on public.produtos (tipo_totvs, grupo_totvs);
