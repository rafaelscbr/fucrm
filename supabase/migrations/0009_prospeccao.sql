-- ==========================================================
--  FuCRM — Funil de PROSPECÇÃO (aquisição de novos clientes)
--  Separado do funil de vendas (orçamentos). Cada conta tem um estágio.
-- ==========================================================

do $$ begin
  create type estagio_prospec_enum as enum ('suspeito','contato','qualificado','demonstracao','ganho','perdido');
exception when duplicate_object then null; end $$;

alter table public.clientes add column if not exists estagio_prospeccao estagio_prospec_enum not null default 'contato';
alter table public.clientes add column if not exists motivo_perda_prospec text;

-- Contas que já compraram/têm orçamento são clientes "ganhos"
update public.clientes c set estagio_prospeccao = 'ganho'
 where exists (select 1 from public.orcamentos o where o.cliente_id = c.id);

-- Prospects de exemplo (sem pedido) espalhados nos estágios, para demo do quadro
insert into public.clientes (razao_social, cidade, estado, tipo_cliente, representante_responsavel_id, estagio_prospeccao, consentimento_lgpd, created_at)
values
 ('Construtora Aurora',       'Itajaí',             'SC', 'consumidor_final', (select id from public.profiles where email='cabral@fucrm.app'), 'suspeito',     true, now()),
 ('Incorporadora Belmonte',   'Balneário Camboriú', 'SC', 'consumidor_final', (select id from public.profiles where email='cabral@fucrm.app'), 'contato',      true, now()),
 ('MaterCasa Depósito',       'Blumenau',           'SC', 'revendedor',       (select id from public.profiles where email='maria@fucrm.app'),  'qualificado',  true, now()),
 ('Rede Construforte',        'Joinville',          'SC', 'revendedor',       (select id from public.profiles where email='joao@fucrm.app'),   'demonstracao', true, now()),
 ('Obras Panorama',           'Caxias do Sul',      'RS', 'consumidor_final', (select id from public.profiles where email='maria@fucrm.app'),  'contato',      true, now()),
 ('Engenharia Sul Forte',     'Curitiba',           'PR', 'consumidor_final', (select id from public.profiles where email='joao@fucrm.app'),   'suspeito',     true, now()),
 ('Depósito Central Materiais','Florianópolis',     'SC', 'revendedor',       (select id from public.profiles where email='ana@fucrm.app'),    'qualificado',  true, now()),
 ('Construtora Vale Verde',   'Chapecó',            'SC', 'consumidor_final', (select id from public.profiles where email='pedro@fucrm.app'),  'demonstracao', true, now());
