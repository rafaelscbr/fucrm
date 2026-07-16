-- Rota do Dia: paradas planejadas pelo representante com check-in por GPS (prova de visita).
create table public.rota_dia (
  id                uuid primary key default gen_random_uuid(),
  representante_id  uuid not null references public.profiles(id),
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  dia               date not null default current_date,
  ordem             int  not null default 0,
  checkin_em        timestamptz,
  checkin_lat       numeric,
  checkin_lng       numeric,
  created_at        timestamptz not null default now(),
  unique (representante_id, dia, cliente_id)
);

alter table public.rota_dia enable row level security;

-- Rep gerencia a própria rota; gestor enxerga todas (acompanhamento).
create policy rota_select on public.rota_dia
  for select to authenticated using (representante_id = auth.uid() or public.is_gestor());
create policy rota_insert on public.rota_dia
  for insert to authenticated with check (representante_id = auth.uid());
create policy rota_update on public.rota_dia
  for update to authenticated using (representante_id = auth.uid());
create policy rota_delete on public.rota_dia
  for delete to authenticated using (representante_id = auth.uid());

create index rota_dia_rep_dia_idx on public.rota_dia (representante_id, dia);
