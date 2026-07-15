-- Pessoa de contato dentro da empresa cliente (quem o representante fala).
alter table public.clientes add column if not exists contato_nome  text;
alter table public.clientes add column if not exists contato_cargo text;
