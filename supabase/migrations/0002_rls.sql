-- ==========================================================
--  FuCRM — Row-Level Security (RLS)
--  Representante enxerga a carteira do time (p/ feed e checagem
--  de duplicidade) mas só altera o que é seu; gestor/admin tudo.
-- ==========================================================

alter table public.profiles                 enable row level security;
alter table public.territorios              enable row level security;
alter table public.representante_territorios enable row level security;
alter table public.clientes                 enable row level security;
alter table public.interacoes               enable row level security;
alter table public.produtos                 enable row level security;
alter table public.tabela_precos            enable row level security;
alter table public.orcamentos               enable row level security;
alter table public.orcamento_itens          enable row level security;
alter table public.carteira_interna         enable row level security;
alter table public.audit_log                enable row level security;

-- ---------- profiles ----------
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_gestor());

-- ---------- territórios / catálogo (todos leem, gestor gerencia) ----------
create policy territorios_select on public.territorios
  for select to authenticated using (true);
create policy territorios_manage on public.territorios
  for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

create policy repterr_select on public.representante_territorios
  for select to authenticated using (true);
create policy repterr_manage on public.representante_territorios
  for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

create policy produtos_select on public.produtos
  for select to authenticated using (true);
create policy produtos_manage on public.produtos
  for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

create policy precos_select on public.tabela_precos
  for select to authenticated using (true);
create policy precos_manage on public.tabela_precos
  for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

-- ---------- carteira interna (só gestor gerencia; todos consultam p/ bloqueio) ----------
create policy carteira_select on public.carteira_interna
  for select to authenticated using (true);
create policy carteira_manage on public.carteira_interna
  for all to authenticated using (public.is_gestor()) with check (public.is_gestor());

-- ---------- clientes ----------
create policy clientes_select on public.clientes
  for select to authenticated using (true);
create policy clientes_insert on public.clientes
  for insert to authenticated with check (true);
create policy clientes_update on public.clientes
  for update to authenticated
  using (representante_responsavel_id = auth.uid() or public.is_gestor());
create policy clientes_delete on public.clientes
  for delete to authenticated using (public.is_gestor());

-- ---------- interações ----------
create policy interacoes_select on public.interacoes
  for select to authenticated using (true);
create policy interacoes_insert on public.interacoes
  for insert to authenticated
  with check (representante_id = auth.uid() or public.is_gestor());
create policy interacoes_update on public.interacoes
  for update to authenticated
  using (representante_id = auth.uid() or public.is_gestor());

-- ---------- orçamentos (rep vê os seus; gestor vê tudo) ----------
create policy orcamentos_select on public.orcamentos
  for select to authenticated
  using (representante_id = auth.uid() or public.is_gestor());
create policy orcamentos_insert on public.orcamentos
  for insert to authenticated
  with check (representante_id = auth.uid() or public.is_gestor());
create policy orcamentos_update on public.orcamentos
  for update to authenticated
  using (representante_id = auth.uid() or public.is_gestor());

create policy itens_select on public.orcamento_itens
  for select to authenticated using (
    exists (select 1 from public.orcamentos o where o.id = orcamento_id
            and (o.representante_id = auth.uid() or public.is_gestor())));
create policy itens_manage on public.orcamento_itens
  for all to authenticated using (
    exists (select 1 from public.orcamentos o where o.id = orcamento_id
            and (o.representante_id = auth.uid() or public.is_gestor())))
  with check (
    exists (select 1 from public.orcamentos o where o.id = orcamento_id
            and (o.representante_id = auth.uid() or public.is_gestor())));

-- ---------- auditoria (gestor lê; qualquer autenticado grava) ----------
create policy audit_select on public.audit_log
  for select to authenticated using (public.is_gestor());
create policy audit_insert on public.audit_log
  for insert to authenticated with check (true);
