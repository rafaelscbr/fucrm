-- ==========================================================
--  FuCRM — Endereços de entrega (um cliente pode ter vários)
--  O escritório/cobrança fica no próprio cadastro do cliente;
--  aqui ficam os locais de entrega (obras, depósitos, filiais).
-- ==========================================================

create table if not exists public.enderecos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  apelido     text,                 -- "Matriz", "Obra Centro", "Depósito"
  logradouro  text,
  numero      text,
  bairro      text,
  cidade      text,
  estado      text,
  cep         text,
  complemento text,
  contato     text,                 -- quem recebe
  telefone    text,
  principal   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_enderecos_cliente on public.enderecos(cliente_id);

-- vínculo do orçamento com o endereço de entrega escolhido
alter table public.orcamentos add column if not exists endereco_entrega_id uuid references public.enderecos(id);

-- RLS: segue a dona do cliente (rep vê os endereços dos seus clientes; gestor vê tudo)
alter table public.enderecos enable row level security;
create policy enderecos_all on public.enderecos for all to authenticated
  using (exists (select 1 from public.clientes c where c.id = cliente_id
                 and (c.representante_responsavel_id = auth.uid() or public.is_gestor())))
  with check (exists (select 1 from public.clientes c where c.id = cliente_id
                 and (c.representante_responsavel_id = auth.uid() or public.is_gestor())));

-- exemplo: entrega diferente do escritório
insert into public.enderecos (cliente_id, apelido, logradouro, numero, bairro, cidade, estado, cep, contato, telefone, principal)
select id, 'Obra Centro', 'Rua das Palmeiras', '450', 'Centro', 'Blumenau', 'SC', '89010-000', 'Sr. João (mestre de obra)', '(47) 99999-1234', true
  from public.clientes where razao_social = 'Construtora Alvorada';
