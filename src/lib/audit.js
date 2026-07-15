import { supabase } from './supabase'

export async function logAudit(acao, entidade, entidadeId, dados = null) {
  try {
    const { data } = await supabase.auth.getUser()
    await supabase.from('audit_log').insert({
      user_id: data?.user?.id ?? null,
      acao,
      entidade,
      entidade_id: entidadeId != null ? String(entidadeId) : null,
      dados,
    })
  } catch (e) {
    console.warn('audit falhou', e)
  }
}
