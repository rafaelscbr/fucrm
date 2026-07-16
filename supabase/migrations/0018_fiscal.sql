-- Impostos por UF (linha POLIPROPILENO/Fuplastic) + característica fiscal do cliente
-- Fontes: planilha DIFAL da Fuplastic (2026) + regras da Ju (TOTVS). Percentuais em %.

alter table public.clientes add column if not exists contribuinte_icms boolean; -- null = não confirmado

create table public.impostos_uf (
  uf            text primary key,
  aliq_interna  numeric not null,   -- alíquota interna do estado destino
  aliq_inter    numeric not null,   -- interestadual SP -> UF
  difal_pp      numeric not null default 0, -- % DIFAL embutido p/ NÃO contribuinte (linha PP)
  mva_pp        numeric,            -- MVA/IVA do ST p/ revendedor (null = não parametrizado ainda)
  aliq_st_pp    numeric,            -- alíquota usada no cálculo do ST (ex.: RS 12)
  atualizado_em timestamptz not null default now()
);

alter table public.impostos_uf enable row level security;
create policy imp_select on public.impostos_uf for select to authenticated using (true);
create policy imp_write  on public.impostos_uf for all to authenticated
  using (public.is_gestor()) with check (public.is_gestor());

insert into public.impostos_uf (uf, aliq_interna, aliq_inter, difal_pp, mva_pp, aliq_st_pp) values
  ('AC', 19.00, 7.00, 13.44, null, null),
  ('AL', 20.50, 7.00, 21.88, null, null),
  ('AM', 20.00, 7.00, 14.69, null, null),
  ('AP', 18.00, 7.00, 12.21, null, null),
  ('BA', 20.50, 7.00, 19.86, null, null),
  ('CE', 20.00, 7.00, 14.69, null, null),
  ('DF', 20.00, 7.00, 14.69, null, null),
  ('ES', 17.00, 7.00, 11.00, null, null),
  ('GO', 19.00, 7.00, 17.01, null, null),
  ('MA', 23.00, 7.00, 24.00, null, null),
  ('MG', 18.00, 12.00, 7.85, null, null),
  ('MS', 17.00, 7.00, 13.50, null, null),
  ('MT', 17.00, 7.00, 11.00, null, null),
  ('PA', 19.00, 7.00, 17.01, null, null),
  ('PB', 20.00, 7.00, 18.89, null, null),
  ('PE', 20.50, 7.00, 19.86, null, null),
  ('PI', 22.50, 7.00, 20.86, null, null),
  ('PR', 19.50, 12.00, 10.18, null, null),
  ('RJ', 20.00, 12.00, 15.00, null, null),
  ('RN', 20.00, 7.00, 12.21, null, null),
  ('RO', 19.50, 7.00, 11.60, null, null),
  ('RR', 20.00, 7.00, 11.00, null, null),
  ('RS', 17.00, 12.00, 7.00, 116.53, 12),
  ('SC', 17.00, 12.00, 0.00, null, null),
  ('SE', 20.00, 7.00, 18.89, null, null),
  ('SP', 18.00, 18.00, 0.00, null, null),
  ('TO', 20.00, 7.00, 18.89, null, null);

-- Snapshot fiscal do orçamento + impostos por item
alter table public.orcamentos add column if not exists fiscal jsonb;
alter table public.orcamento_itens add column if not exists imposto_unit numeric not null default 0; -- ST ou DIFAL por unidade
alter table public.orcamento_itens add column if not exists ipi_unit     numeric not null default 0;

-- Total passa a somar impostos por fora (ST/DIFAL/IPI) + frete
create or replace function public.orc_total_before()
returns trigger language plpgsql as $$
begin
  new.valor_total := coalesce(
    (select sum(i.subtotal + (coalesce(i.imposto_unit,0) + coalesce(i.ipi_unit,0)) * i.quantidade)
       from public.orcamento_itens i where i.orcamento_id = new.id), 0
  ) + coalesce(new.valor_frete, 0);
  return new;
end; $$;
