// Fila local para registrar visita SEM sinal — sincroniza quando a conexão volta.
import { supabase } from './supabase'
const KEY = 'fucrm_fila_visitas'

export function lerFila() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
function salvar(f) { localStorage.setItem(KEY, JSON.stringify(f)) }
export function enfileirarVisita(interacao, extraCliente) {
  const f = lerFila(); f.push({ interacao, extraCliente, ts: Date.now() }); salvar(f)
}

export async function sincronizarFila() {
  const f = lerFila()
  if (!f.length || !navigator.onLine) return 0
  const restantes = []
  let enviados = 0
  for (const item of f) {
    const { error } = await supabase.from('interacoes').insert(item.interacao)
    if (error) { restantes.push(item); continue }
    if (item.extraCliente) await supabase.from('clientes').update(item.extraCliente.dados).eq('id', item.extraCliente.id)
    enviados++
  }
  salvar(restantes)
  return enviados
}
