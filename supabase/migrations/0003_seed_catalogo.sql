-- ==========================================================
--  FuCRM — Seed inicial de catálogo e territórios (demonstração)
--  Produtos com o padrão de "código inteligente" (tipo + dimensões).
-- ==========================================================

insert into public.territorios (nome, definicao) values
  ('Vale do Itajaí',      '{"estados":["SC"],"cidades":["Blumenau","Itajaí","Brusque"]}'),
  ('Grande Florianópolis','{"estados":["SC"],"cidades":["Florianópolis","São José","Palhoça"]}'),
  ('Serra Gaúcha',        '{"estados":["RS"],"cidades":["Caxias do Sul","Bento Gonçalves"]}'),
  ('Grande Curitiba',     '{"estados":["PR"],"cidades":["Curitiba","São José dos Pinhais"]}');

-- Caixas ST (Standard) + tampas correspondentes
insert into public.produtos (codigo_inteligente, tipo, comprimento_mm, largura_mm, altura_mm, linha, descricao, peso_bruto_kg)
values
  ('CST 00600 0600 0490', 'Caixa ST', 600, 600, 490, 'infraestrutura', 'Caixa de passagem ST 600x600x490', 14.8),
  ('CST 00400 0400 0400', 'Caixa ST', 400, 400, 400, 'infraestrutura', 'Caixa de passagem ST 400x400x400', 8.2),
  ('CST 00800 0800 0600', 'Caixa ST', 800, 800, 600, 'infraestrutura', 'Caixa de passagem ST 800x800x600', 24.5);

insert into public.produtos (codigo_inteligente, tipo, comprimento_mm, largura_mm, linha, descricao, peso_bruto_kg, referencia_pai_id)
select 'TST 00600 0600', 'Tampa ST', 600, 600, 'infraestrutura', 'Tampa ST para caixa 600x600', 4.4, id
  from public.produtos where codigo_inteligente = 'CST 00600 0600 0490';
insert into public.produtos (codigo_inteligente, tipo, comprimento_mm, largura_mm, linha, descricao, peso_bruto_kg, referencia_pai_id)
select 'TST 00400 0400', 'Tampa ST', 400, 400, 'infraestrutura', 'Tampa ST para caixa 400x400', 2.1, id
  from public.produtos where codigo_inteligente = 'CST 00400 0400 0400';
