-- ==========================================================
--  FuCRM — Ciclo de vida da conta: Lead → Prospect → Cliente
--  Lead: sem contato ainda. Prospect: contato feito (visita/interação).
--  Cliente: aprovou um orçamento. + Descartado (perdido).
-- ==========================================================

do $$ begin
  create type estagio_conta_enum as enum ('lead','prospect','cliente','descartado');
exception when duplicate_object then null; end $$;

alter table public.clientes add column if not exists estagio estagio_conta_enum not null default 'lead';

-- Migra o funil antigo (6 estágios) para o novo (3+1)
update public.clientes set estagio = case estagio_prospeccao
  when 'ganho'        then 'cliente'::estagio_conta_enum
  when 'perdido'      then 'descartado'::estagio_conta_enum
  when 'qualificado'  then 'prospect'::estagio_conta_enum
  when 'demonstracao' then 'prospect'::estagio_conta_enum
  else 'lead'::estagio_conta_enum
end;

-- Quem já tem contato registrado é ao menos prospect
update public.clientes c set estagio = 'prospect'
 where estagio = 'lead' and exists (select 1 from public.interacoes i where i.cliente_id = c.id);

-- Quem tem orçamento aprovado/faturado é cliente
update public.clientes c set estagio = 'cliente'
 where exists (select 1 from public.orcamentos o where o.cliente_id = c.id and o.status in ('aprovado','lancado_totvs','faturado'));

-- Gatilho: registrar contato (interação) promove Lead → Prospect
create or replace function public.promover_prospect() returns trigger language plpgsql as $$
begin
  update public.clientes set estagio = 'prospect' where id = new.cliente_id and estagio = 'lead';
  return new;
end $$;
drop trigger if exists trg_promover_prospect on public.interacoes;
create trigger trg_promover_prospect after insert on public.interacoes
  for each row execute function public.promover_prospect();

-- Gatilho: orçamento aprovado promove a conta a Cliente
create or replace function public.promover_cliente() returns trigger language plpgsql as $$
begin
  if new.status in ('aprovado','lancado_totvs','faturado') then
    update public.clientes set estagio = 'cliente' where id = new.cliente_id and estagio <> 'cliente';
  end if;
  return new;
end $$;
drop trigger if exists trg_promover_cliente on public.orcamentos;
create trigger trg_promover_cliente after insert or update of status on public.orcamentos
  for each row execute function public.promover_cliente();
