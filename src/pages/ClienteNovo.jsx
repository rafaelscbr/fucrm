import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { logAudit } from '../lib/audit'
import { buscarCnpj } from '../lib/cnpj'
import { buscarCep } from '../lib/cep'

const UF_LIST = ['SC', 'RS', 'PR', 'SP', 'MG', 'RJ', 'BA', 'GO', 'MT', 'MS', 'PA', 'PE', 'CE', 'DF', 'ES', 'PB', 'RN', 'AL', 'SE', 'PI', 'MA', 'TO', 'RO', 'AC', 'AM', 'RR', 'AP']

export default function ClienteNovo() {
  const { session } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [f, setF] = useState({
    razao_social: '', nome_fantasia: '', cnpj_cpf: '', tipo_pessoa: 'pj',
    tipo_cliente: 'consumidor_final', telefone: '', email: '', cidade: '', estado: 'SC',
    endereco: '', cep: '', matriz_filial: 'matriz', consentimento_lgpd: false,
  })
  const [buscando, setBuscando] = useState('')
  const [dups, setDups] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  async function checarDup() {
    const termo = (f.razao_social.trim() || f.cnpj_cpf.trim())
    if (termo.length < 3) { setDups([]); return }
    const { data } = await supabase.rpc('buscar_duplicados', { termo })
    setDups(data || [])
  }

  async function onCnpjBlur() {
    checarDup()
    if ((f.cnpj_cpf || '').replace(/\D/g, '').length !== 14) return
    setBuscando('cnpj')
    const info = await buscarCnpj(f.cnpj_cpf)
    setBuscando('')
    if (info) setF((s) => ({
      ...s,
      razao_social: s.razao_social || info.razao_social,
      nome_fantasia: s.nome_fantasia || info.nome_fantasia,
      telefone: s.telefone || info.telefone,
      email: s.email || info.email,
      endereco: s.endereco || info.endereco,
      cidade: s.cidade || info.cidade,
      estado: info.estado || s.estado,
      cep: s.cep || info.cep,
    }))
  }

  async function onCepBlur() {
    if ((f.cep || '').replace(/\D/g, '').length !== 8) return
    setBuscando('cep')
    const info = await buscarCep(f.cep)
    setBuscando('')
    if (info) setF((s) => ({ ...s, endereco: s.endereco || info.logradouro, cidade: info.cidade || s.cidade, estado: info.estado || s.estado }))
  }
  const bloqueio = dups.find((d) => d.origem === 'carteira_interna' || d.bloqueado)
  const jaTemDono = dups.find((d) => d.origem === 'cliente' && d.dono && d.dono !== session.user.id)

  async function salvar(e) {
    e.preventDefault(); setErr('')
    if (bloqueio) { setErr('Cliente em carteira interna / bloqueado — não pode ser trabalhado.'); return }
    if (!f.consentimento_lgpd) { setErr('Marque o consentimento do cliente (LGPD) para cadastrar.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('clientes').insert({
      ...f,
      representante_responsavel_id: session.user.id,
      representante_primeiro_contato_id: session.user.id,
      data_primeiro_registro: new Date().toISOString(),
      created_by: session.user.id,
      consentimento_data: new Date().toISOString(),
    }).select('id').single()
    setSaving(false)
    if (error) { setErr(error.message); return }
    await logAudit('criar', 'cliente', data.id, { razao_social: f.razao_social })
    toast('Cliente cadastrado')
    nav(`/clientes/${data.id}`)
  }

  return (
    <div>
      <button className="back" onClick={() => nav(-1)}>‹ Voltar</button>
      <div className="page-head"><h1>Novo cliente</h1></div>

      {bloqueio && <div className="banner danger"><span>⛔</span><span><b>Bloqueado:</b> {bloqueio.nome} — {bloqueio.detalhe}. Não pode ser cadastrado.</span></div>}
      {!bloqueio && jaTemDono && <div className="banner warn"><span>⚠</span><span><b>Já existe:</b> {jaTemDono.nome} ({jaTemDono.detalhe}) já tem responsável.</span></div>}
      {err && <div className="err">{err}</div>}

      <form onSubmit={salvar}>
        <div className="grid-form">
          <div className="field full">
            <label>Razão social *</label>
            <input className="input" required value={f.razao_social}
              onChange={(e) => set('razao_social', e.target.value)} onBlur={checarDup} />
          </div>
          <div className="field"><label>Nome fantasia</label>
            <input className="input" value={f.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} /></div>
          <div className="field"><label>CNPJ / CPF {buscando === 'cnpj' && <span className="faint">· buscando…</span>}</label>
            <input className="input" value={f.cnpj_cpf} onChange={(e) => set('cnpj_cpf', e.target.value)} onBlur={onCnpjBlur} placeholder="Digite o CNPJ para preencher" /></div>
          <div className="field"><label>Tipo de pessoa</label>
            <select className="select" value={f.tipo_pessoa} onChange={(e) => set('tipo_pessoa', e.target.value)}>
              <option value="pj">Pessoa jurídica</option><option value="pf">Pessoa física</option></select></div>
          <div className="field"><label>Tipo de cliente</label>
            <select className="select" value={f.tipo_cliente} onChange={(e) => set('tipo_cliente', e.target.value)}>
              <option value="consumidor_final">Consumidor final</option>
              <option value="revendedor">Revendedor</option>
              <option value="exportacao">Exportação</option>
              <option value="produtor_rural">Produtor rural</option></select></div>
          <div className="field"><label>Telefone</label>
            <input className="input" value={f.telefone} onChange={(e) => set('telefone', e.target.value)} /></div>
          <div className="field"><label>E-mail</label>
            <input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="field"><label>Cidade</label>
            <input className="input" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></div>
          <div className="field"><label>Estado (crítico p/ tributação)</label>
            <select className="select" value={f.estado} onChange={(e) => set('estado', e.target.value)}>
              {UF_LIST.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
          <div className="field"><label>Matriz / filial</label>
            <select className="select" value={f.matriz_filial} onChange={(e) => set('matriz_filial', e.target.value)}>
              <option value="matriz">Matriz</option><option value="filial">Filial</option></select></div>
          <div className="field"><label>CEP {buscando === 'cep' && <span className="faint">· buscando…</span>}</label>
            <input className="input" value={f.cep} onChange={(e) => set('cep', e.target.value)} onBlur={onCepBlur} placeholder="00000-000" /></div>
          <div className="field full"><label>Endereço</label>
            <input className="input" value={f.endereco} onChange={(e) => set('endereco', e.target.value)} /></div>
        </div>

        <label className="banner accent" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={f.consentimento_lgpd}
            onChange={(e) => set('consentimento_lgpd', e.target.checked)} style={{ marginTop: 3 }} />
          <span><b>Consentimento LGPD:</b> o cliente autoriza o registro dos seus dados de contato e relacionamento.</span>
        </label>

        <button className="btn block" type="submit" disabled={saving || !!bloqueio}>
          {saving ? 'Salvando…' : 'Cadastrar cliente'}
        </button>
      </form>
    </div>
  )
}
