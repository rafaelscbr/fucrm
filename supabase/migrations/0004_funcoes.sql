-- ==========================================================
--  FuCRM — Funções: checagem de duplicidade/bloqueio e total do orçamento
-- ==========================================================

-- Busca fuzzy (pg_trgm) por clientes existentes e carteira interna bloqueada.
create or replace function public.buscar_duplicados(termo text)
returns table (origem text, id uuid, nome text, detalhe text, bloqueado boolean, dono uuid)
language sql stable security definer set search_path = public as $$
  select 'cliente', c.id, c.razao_social,
         trim(coalesce(c.cidade,'') || ' ' || coalesce(c.estado,'')),
         c.bloqueado, c.representante_responsavel_id
    from public.clientes c
   where termo is not null and length(termo) >= 3
     and (c.razao_social ilike '%'||termo||'%'
          or c.razao_social % termo
          or c.cnpj_cpf = termo)
  union all
  select 'carteira_interna', ci.id, ci.razao_social, coalesce(ci.motivo,'Carteira interna'),
         true, null::uuid
    from public.carteira_interna ci
   where termo is not null and length(termo) >= 3
     and (ci.razao_social ilike '%'||termo||'%'
          or ci.razao_social % termo
          or ci.cnpj_cpf = termo)
  limit 12
$$;
grant execute on function public.buscar_duplicados(text) to authenticated;

-- Recalcula o total do orçamento (itens + frete).
create or replace function public.orc_total_before()
returns trigger language plpgsql as $$
begin
  new.valor_total := coalesce(
    (select sum(i.subtotal) from public.orcamento_itens i where i.orcamento_id = new.id), 0
  ) + coalesce(new.valor_frete, 0);
  return new;
end; $$;
create trigger trg_orc_total before update on public.orcamentos
  for each row execute function public.orc_total_before();

create or replace function public.itens_after()
returns trigger language plpgsql as $$
declare orc uuid := coalesce(new.orcamento_id, old.orcamento_id);
begin
  update public.orcamentos set updated_at = now() where id = orc;  -- dispara trg_orc_total
  return null;
end; $$;
create trigger trg_itens_after after insert or update or delete on public.orcamento_itens
  for each row execute function public.itens_after();
