-- ==========================================================
--  FuCRM — RLS: representante vê APENAS a própria carteira
--  (gestor/admin continuam vendo tudo). Duplicidade segue
--  funcionando via buscar_duplicados (SECURITY DEFINER).
-- ==========================================================

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes
  for select to authenticated
  using (representante_responsavel_id = auth.uid() or public.is_gestor());

drop policy if exists interacoes_select on public.interacoes;
create policy interacoes_select on public.interacoes
  for select to authenticated
  using (
    representante_id = auth.uid() or public.is_gestor()
    or exists (select 1 from public.clientes c
               where c.id = cliente_id and c.representante_responsavel_id = auth.uid())
  );
