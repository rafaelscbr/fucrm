-- Observações/fonte por UF (rastreabilidade das MVAs: de onde veio, se a Ju validou)
alter table public.impostos_uf add column if not exists mva_obs text;

-- SP interna: MVA oficial do CEST 10.006.00 (tubos/caixas plástico p/ construção)
-- Portaria SRE 5/2026: 84% -> 72%, vigente desde 01/04/2026. Alíq. ST = interna SP 18%.
update public.impostos_uf set
  mva_pp = 72, aliq_st_pp = 18,
  mva_obs = 'MVA oficial SP: Portaria SRE 5/2026 (CEST 10.006.00, vigente 01/04/2026) — pendente validação Ju/TOTVS'
where uf = 'SP';

-- RS: número da Ju (116,53%), mas o Protocolo ICMS 45/2026 alterou o SP-RS a partir de 01/07/2026
update public.impostos_uf set
  mva_obs = 'MVA da Ju (116,53%/12%). ATENÇÃO: Protocolo ICMS 45/2026 alterou o SP-RS desde 01/07/2026 — revalidar com a Ju'
where uf = 'RS';

-- SC: protocolo 116/2012 unilateral; MVA pública achada (36%) é de 2012 = desatualizada. Não aplicar.
update public.impostos_uf set
  mva_obs = 'ST SP->SC existe (Prot. 116/2012), mas MVA pública encontrada é de 2012 — aguardando número atual da Ju'
where uf = 'SC';

-- PR: protocolos 196/2009 + 69/2011 etc. (SP signatário) = ST ativa; MVA atual não obtida em fonte oficial.
update public.impostos_uf set
  mva_obs = 'ST SP->PR ativa (Prot. 196/2009 e correlatos) — aguardando MVA atual da Ju'
where uf = 'PR';
