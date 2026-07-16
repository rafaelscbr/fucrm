import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { buscarCnpj } from '../lib/cnpj'
import { buscarCep } from '../lib/cep'

const UF_LIST = ['SC', 'RS', 'PR', 'SP', 'MG', 'RJ', 'BA', 'GO', 'MT', 'MS', 'PA', 'PE', 'CE', 'DF', 'ES', 'PB', 'RN', 'AL', 'SE', 'PI', 'MA', 'TO', 'RO', 'AC', 'AM', 'RR', 'AP']
const DP_FIELDS = [['esposa', 'Esposa'], ['marido', 'Marido'], ['filha', 'Filha'], ['filho', 'Filho'], ['interesses', 'Interesses'], ['familia', 'Família']]
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export default function ClienteEditar() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [f, setF] = useState(null)
  const [dp, setDp] = useState({})
  const [anivDia, setAnivDia] = useState('')
  const [anivMes, setAnivMes] = useState('')
  const [saving, setSaving] = useState(false)
  const [buscando, setBuscando] = useState('')

  useEffect(() => {
    supabase.from('clientes').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setF(data); setDp(data.dados_pessoais || {})
        const m = String(data.dados_pessoais?.aniversario || '').match(/(\d{1,2})\s*[/\-.]\s*(\d{1,2})/)
        if (m) { setAnivDia(String(+m[1])); setAnivMes(String(+m[2])) }
      }
    })
  }, [id])

  // dia + mês viram "dd/mm" em dados_pessoais.aniversario (formato que o app inteiro já lê)
  useEffect(() => {
    if (anivDia && anivMes) setDp((s) => ({ ...s, aniversario: `${anivDia.padStart(2, '0')}/${anivMes.padStart(2, '0')}` }))
    else if (!anivDia && !anivMes) setDp((s) => ({ ...s, aniversario: '' }))
  }, [anivDia, anivMes])

  if (!f) return <div className="spinner" />
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const setD = (k, v) => setDp((s) => ({ ...s, [k]: v }))

  async function onCep() {
    if ((f.cep || '').replace(/\D/g, '').length !== 8) return
    setBuscando('cep'); const i = await buscarCep(f.cep); setBuscando('')
    if (i) setF((s) => ({ ...s, endereco: s.endereco || i.logradouro, cidade: i.cidade || s.cidade, estado: i.estado || s.estado }))
  }
  async function onCnpj() {
    if ((f.cnpj_cpf || '').replace(/\D/g, '').length !== 14) return
    setBuscando('cnpj'); const i = await buscarCnpj(f.cnpj_cpf); setBuscando('')
    if (i) setF((s) => ({ ...s, razao_social: s.razao_social || i.razao_social, nome_fantasia: s.nome_fantasia || i.nome_fantasia, telefone: s.telefone || i.telefone, endereco: s.endereco || i.endereco, cidade: s.cidade || i.cidade, estado: s.estado || i.estado, cep: s.cep || i.cep }))
  }

  async function salvar() {
    setSaving(true)
    const dpClean = Object.fromEntries(Object.entries(dp).filter(([, v]) => v != null && String(v).trim() !== ''))
    const { error } = await supabase.from('clientes').update({
      razao_social: f.razao_social, nome_fantasia: f.nome_fantasia || null, cnpj_cpf: f.cnpj_cpf || null,
      inscricao_estadual: f.inscricao_estadual || null, tipo_pessoa: f.tipo_pessoa, tipo_cliente: f.tipo_cliente,
      telefone: f.telefone || null, email: f.email || null, cep: f.cep || null, endereco: f.endereco || null,
      cidade: f.cidade || null, estado: f.estado || null, matriz_filial: f.matriz_filial, dados_pessoais: dpClean,
      contato_nome: f.contato_nome || null, contato_cargo: f.contato_cargo || null,
      contribuinte_icms: f.contribuinte_icms ?? null,
    }).eq('id', id)
    setSaving(false)
    if (error) toast('Não foi possível salvar.', 'erro')
    else { toast('Cliente atualizado'); nav(`/clientes/${id}`) }
  }

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head"><h1>Editar cliente</h1></div>

      <div className="grid-form">
        <div className="field full"><label>Razão social *</label><input className="input" value={f.razao_social || ''} onChange={(e) => set('razao_social', e.target.value)} /></div>
        <div className="field"><label>Nome fantasia</label><input className="input" value={f.nome_fantasia || ''} onChange={(e) => set('nome_fantasia', e.target.value)} /></div>
        <div className="field"><label>CNPJ / CPF {buscando === 'cnpj' && <span className="faint">· buscando…</span>}</label><input className="input" value={f.cnpj_cpf || ''} onChange={(e) => set('cnpj_cpf', e.target.value)} onBlur={onCnpj} /></div>
        <div className="field"><label>Inscrição estadual</label><input className="input" value={f.inscricao_estadual || ''} onChange={(e) => set('inscricao_estadual', e.target.value)} /></div>
        <div className="field"><label>Tipo de pessoa</label><select className="select" value={f.tipo_pessoa} onChange={(e) => set('tipo_pessoa', e.target.value)}><option value="pj">Pessoa jurídica</option><option value="pf">Pessoa física</option></select></div>
        <div className="field"><label>Tipo de cliente</label><select className="select" value={f.tipo_cliente} onChange={(e) => set('tipo_cliente', e.target.value)}><option value="consumidor_final">Consumidor final</option><option value="revendedor">Revendedor</option><option value="exportacao">Exportação</option><option value="produtor_rural">Produtor rural</option></select></div>
        <div className="field"><label>Contribuinte de ICMS? (define o preço)</label>
          <select className="select" value={f.contribuinte_icms === true ? 'sim' : f.contribuinte_icms === false ? 'nao' : ''}
            onChange={(e) => set('contribuinte_icms', e.target.value === '' ? null : e.target.value === 'sim')}>
            <option value="">Não confirmado</option>
            <option value="sim">Sim, contribuinte</option>
            <option value="nao">Não contribuinte</option></select></div>
        <div className="field"><label>Pessoa de contato</label><input className="input" value={f.contato_nome || ''} onChange={(e) => set('contato_nome', e.target.value)} placeholder="ex.: João Silva" /></div>
        <div className="field"><label>Cargo do contato</label><input className="input" value={f.contato_cargo || ''} onChange={(e) => set('contato_cargo', e.target.value)} placeholder="ex.: Comprador" /></div>
        <div className="field"><label>Telefone</label><input className="input" value={f.telefone || ''} onChange={(e) => set('telefone', e.target.value)} /></div>
        <div className="field"><label>E-mail</label><input className="input" type="email" value={f.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
        <div className="field"><label>CEP {buscando === 'cep' && <span className="faint">· buscando…</span>}</label><input className="input" value={f.cep || ''} onChange={(e) => set('cep', e.target.value)} onBlur={onCep} /></div>
        <div className="field full"><label>Endereço</label><input className="input" value={f.endereco || ''} onChange={(e) => set('endereco', e.target.value)} /></div>
        <div className="field"><label>Cidade</label><input className="input" value={f.cidade || ''} onChange={(e) => set('cidade', e.target.value)} /></div>
        <div className="field"><label>Estado</label><select className="select" value={f.estado || ''} onChange={(e) => set('estado', e.target.value)}><option value="">—</option>{UF_LIST.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
        <div className="field"><label>Matriz / filial</label><select className="select" value={f.matriz_filial} onChange={(e) => set('matriz_filial', e.target.value)}><option value="matriz">Matriz</option><option value="filial">Filial</option></select></div>
      </div>

      <h3 style={{ fontSize: 15, margin: '8px 0 12px' }}>Relacionamento</h3>
      <div className="grid-form">
        <div className="field"><label>Aniversário do contato</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="select" value={anivDia} onChange={(e) => setAnivDia(e.target.value)} aria-label="Dia">
              <option value="">Dia</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
            </select>
            <select className="select" value={anivMes} onChange={(e) => setAnivMes(e.target.value)} aria-label="Mês">
              <option value="">Mês</option>
              {MESES.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
        </div>
        {DP_FIELDS.map(([k, label]) => (
          <div className="field" key={k}><label>{label}</label><input className="input" value={dp[k] || ''} onChange={(e) => setD(k, e.target.value)} /></div>
        ))}
      </div>

      <button className="btn block" onClick={salvar} disabled={saving || !f.razao_social}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
    </div>
  )
}
