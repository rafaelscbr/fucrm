-- ==========================================================
--  FuCRM — Tipo de frete passa a ser FOB ou CIF
--  Obs.: no Postgres, "add value" e o uso do novo valor não
--  podem estar na mesma transação — aplicar em 2 passos.
-- ==========================================================

-- Passo 1 (isolado):
alter type public.tipo_frete_enum add value if not exists 'FOB';

-- Passo 2:
update public.orcamentos set tipo_frete = 'FOB' where tipo_frete = 'F';
alter table public.orcamentos alter column tipo_frete set default 'FOB';
