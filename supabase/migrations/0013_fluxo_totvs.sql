-- ==========================================================
--  FuCRM — Novo fluxo do orçamento (cadastro no TOTVS + notificações)
--  Rascunho → Enviado → Aguardando TOTVS (cliente aprovou) →
--  Lançado no TOTVS → Faturado. Venda conta no Faturado.
-- ==========================================================

alter type status_orcamento_enum add value if not exists 'aguardando_totvs';
-- @@SPLIT@@

-- Migra os status antigos para o novo fluxo
update public.orcamentos set status = 'aguardando_totvs'
 where status in ('confirmado', 'em_aprovacao', 'aprovado');

-- ---------- Notificações ----------
create table if not exists public.notificacoes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  texto        text not null,
  orcamento_id uuid,
  lida         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notificacoes(user_id, lida);
alter table public.notificacoes enable row level security;
create policy notif_select on public.notificacoes for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notificacoes for update to authenticated using (user_id = auth.uid());
create policy notif_insert on public.notificacoes for insert to authenticated with check (true);
do $$ begin alter publication supabase_realtime add table public.notificacoes; exception when others then null; end $$;

-- Notifica o representante quando lançado no TOTVS e quando faturado
create or replace function public.notif_status() returns trigger language plpgsql as $$
begin
  if new.status = 'lancado_totvs' and old.status is distinct from 'lancado_totvs' then
    insert into public.notificacoes (user_id, texto, orcamento_id)
    values (new.representante_id, 'Orçamento Nº ' || new.numero || ' foi lançado no TOTVS.', new.id);
  elsif new.status = 'faturado' and old.status is distinct from 'faturado' then
    insert into public.notificacoes (user_id, texto, orcamento_id)
    values (new.representante_id, 'Orçamento Nº ' || new.numero || ' faturado! Conta para a sua meta.', new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_status on public.orcamentos;
create trigger trg_notif_status after update of status on public.orcamentos
  for each row execute function public.notif_status();

-- Conta vira Cliente quando o cliente aprova (aguardando_totvs) em diante
create or replace function public.promover_cliente() returns trigger language plpgsql as $$
begin
  if new.status in ('aguardando_totvs', 'lancado_totvs', 'faturado') then
    update public.clientes set estagio = 'cliente' where id = new.cliente_id and estagio <> 'cliente';
  end if;
  return new;
end $$;
