-- Coordenadas exatas por cliente (geocodificadas do endereço).
-- Proximidade e rota passam a usar o ponto do cliente; sem coordenada, cai no centro da cidade.
alter table public.clientes add column if not exists lat numeric;
alter table public.clientes add column if not exists lng numeric;
