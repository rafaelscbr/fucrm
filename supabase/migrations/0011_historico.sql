-- ==========================================================
--  FuCRM — "Tentativa de contato" (sub-lead) + histórico automático
--  Toda mudança de estágio e todo orçamento viram registro no
--  histórico do cliente (interações) — insumo para o briefing da IA.
-- ==========================================================

alter type estagio_conta_enum add value if not exists 'tentativa';
-- @@SPLIT@@

-- Log de mudança de estágio → interação (tipo 'ocorrencia')
create or replace function public.log_estagio() returns trigger language plpgsql as $$
begin
  if new.estagio is distinct from old.estagio then
    insert into public.interacoes (cliente_id, representante_id, canal, tipo, resumo, data)
    values (new.id, new.representante_responsavel_id, 'outro', 'ocorrencia',
      case new.estagio
        when 'tentativa'  then 'Tentativa de contato'
        when 'prospect'   then 'Avançou para Prospect'
        when 'cliente'    then 'Tornou-se Cliente'
        when 'descartado' then 'Descartado' || coalesce(' — ' || new.motivo_perda_prospec, '')
        when 'lead'       then 'Voltou para Lead'
        else 'Estágio: ' || new.estagio::text
      end, now());
  end if;
  return new;
end $$;
drop trigger if exists trg_log_estagio on public.clientes;
create trigger trg_log_estagio after update of estagio on public.clientes
  for each row execute function public.log_estagio();

-- Log de orçamento criado → interação
create or replace function public.log_orcamento() returns trigger language plpgsql as $$
begin
  insert into public.interacoes (cliente_id, representante_id, canal, tipo, resumo, data)
  values (new.cliente_id, new.representante_id, 'outro', 'ocorrencia',
    'Orçamento Nº ' || new.numero || ' criado', now());
  return new;
end $$;
drop trigger if exists trg_log_orcamento on public.orcamentos;
create trigger trg_log_orcamento after insert on public.orcamentos
  for each row execute function public.log_orcamento();

-- Promoção Lead/Tentativa → Prospect só em contato REAL (não em eventos 'ocorrencia')
create or replace function public.promover_prospect() returns trigger language plpgsql as $$
begin
  if new.tipo <> 'ocorrencia' then
    update public.clientes set estagio = 'prospect'
     where id = new.cliente_id and estagio in ('lead','tentativa');
  end if;
  return new;
end $$;
