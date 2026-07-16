-- IVA-ST oficial da planilha da Ju (CALCULO ST.xlsx, TOTVS) — linha POLIPROPILENO.
-- Fórmula validada contra o exemplo embutido da própria planilha (ES: 175 -> 181,00).
-- CORREÇÃO IMPORTANTE: o 116,53% citado na conversa era do FERRO; PP no RS é 95,2%.

update public.impostos_uf set mva_pp=67.00, aliq_st_pp=18, mva_obs='IVA Ju (planilha CALCULO ST). Atenção: pesquisa achou 72% (Portaria SRE 5/2026 desde 01/04/2026) — confirmar qual está no TOTVS' where uf='SP';
update public.impostos_uf set mva_pp=95.20, aliq_st_pp=12, mva_obs='IVA Ju (planilha CALCULO ST) — PP. (116,53% era ferro fundido)' where uf='RS';
update public.impostos_uf set mva_pp=49.17, aliq_st_pp=12, mva_obs='IVA Ju (planilha CALCULO ST)' where uf='PR';
update public.impostos_uf set mva_pp=49.60, aliq_st_pp=12, mva_obs='IVA Ju (planilha CALCULO ST)' where uf='RJ';
update public.impostos_uf set mva_pp=44.88, aliq_st_pp=12, mva_obs='IVA Ju (planilha CALCULO ST)' where uf='MG';
update public.impostos_uf set mva_pp=49.02, aliq_st_pp=7,  mva_obs='IVA Ju (planilha CALCULO ST)' where uf='ES';
update public.impostos_uf set mva_pp=54.24, aliq_st_pp=7,  mva_obs='IVA Ju (planilha CALCULO ST)' where uf='PE';
update public.impostos_uf set mva_pp=49.73, aliq_st_pp=7,  mva_obs='IVA Ju (planilha CALCULO ST)' where uf='MT';
update public.impostos_uf set mva_pp=53.11, aliq_st_pp=7,  mva_obs='IVA Ju (planilha CALCULO ST)' where uf='BA';
update public.impostos_uf set mva_pp=50.84, aliq_st_pp=7,  mva_obs='IVA Ju (planilha CALCULO ST)' where uf='DF';
update public.impostos_uf set mva_pp=50.84, aliq_st_pp=7,  mva_obs='IVA Ju (planilha CALCULO ST)' where uf='AP';
update public.impostos_uf set mva_pp=54.24, aliq_st_pp=7,  mva_obs='IVA Ju (planilha CALCULO ST)' where uf='AL';
-- SE: célula inválida na planilha ("Só não q") — segue pendente
update public.impostos_uf set mva_obs='célula do IVA PP veio inválida na planilha da Ju — pedir o número' where uf='SE';
-- UFs fora da tabela da Ju: tratadas como SEM ST de PP (não soma, sem aviso) — confirmar com a Ju
update public.impostos_uf set mva_pp=0, aliq_st_pp=0,
  mva_obs='fora da tabela da Ju: tratado como SEM ST de PP — confirmar'
where uf in ('AC','AM','CE','GO','MA','MS','PA','PB','PI','RN','RO','RR','SC','TO');
