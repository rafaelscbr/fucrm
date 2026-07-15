-- Marcos (timestamps) de cada etapa do fluxo do orçamento.
-- Ficam na própria tabela orcamentos, então o representante lê o histórico
-- do seu próprio orçamento via RLS (audit_log é só do gestor).

alter table public.orcamentos add column if not exists enviado_em          timestamptz;
alter table public.orcamentos add column if not exists aprovado_cliente_em timestamptz;
alter table public.orcamentos add column if not exists lancado_em          timestamptz;
alter table public.orcamentos add column if not exists faturado_em         timestamptz;
alter table public.orcamentos add column if not exists perdido_em          timestamptz;

-- Carimba automaticamente o marco na primeira vez que o status chega em cada etapa.
-- Cobre botões, drag no funil e Kanban, sem precisar tocar em cada tela.
create or replace function public.stamp_marcos_orcamento()
returns trigger language plpgsql as $$
begin
  if new.status = 'enviado'         and new.enviado_em          is null then new.enviado_em          := now(); end if;
  if new.status = 'aguardando_totvs' and new.aprovado_cliente_em is null then new.aprovado_cliente_em := now(); end if;
  if new.status = 'lancado_totvs'   and new.lancado_em          is null then new.lancado_em          := now(); end if;
  if new.status = 'faturado'        and new.faturado_em         is null then new.faturado_em         := now(); end if;
  if new.status = 'perdido'         and new.perdido_em          is null then new.perdido_em          := now(); end if;
  return new;
end $$;

drop trigger if exists trg_stamp_marcos on public.orcamentos;
create trigger trg_stamp_marcos before insert or update of status on public.orcamentos
  for each row execute function public.stamp_marcos_orcamento();

-- Backfill aproximado para orçamentos que já existem (usa os timestamps disponíveis).
update public.orcamentos set enviado_em          = coalesce(updated_at, created_at) where status <> 'rascunho'                                    and enviado_em          is null;
update public.orcamentos set aprovado_cliente_em = coalesce(aprovado_em, updated_at) where status in ('aguardando_totvs','lancado_totvs','faturado') and aprovado_cliente_em is null;
update public.orcamentos set lancado_em          = coalesce(aprovado_em, updated_at) where status in ('lancado_totvs','faturado')                    and lancado_em          is null;
update public.orcamentos set faturado_em         = updated_at                        where status = 'faturado'                                       and faturado_em         is null;
update public.orcamentos set perdido_em          = updated_at                        where status = 'perdido'                                        and perdido_em          is null;
