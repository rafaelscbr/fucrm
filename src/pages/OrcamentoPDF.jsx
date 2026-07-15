import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { brl, tipoClienteLabel, dataBR } from '../lib/format'
import { EMPRESA } from '../lib/empresa'

export default function OrcamentoPDF() {
  const { id } = useParams()
  const nav = useNavigate()
  const [o, setO] = useState(null)
  const [cli, setCli] = useState(null)
  const [itens, setItens] = useState([])
  const [rep, setRep] = useState(null)

  useEffect(() => {
    (async () => {
      const { data: orc } = await supabase.from('orcamentos').select('*').eq('id', id).single()
      setO(orc)
      if (orc) {
        const [{ data: c }, { data: it }, r] = await Promise.all([
          supabase.from('clientes').select('*').eq('id', orc.cliente_id).single(),
          supabase.from('orcamento_itens').select('*').eq('orcamento_id', id),
          orc.representante_id ? supabase.from('profiles').select('nome,codigo_vendedor_totvs').eq('id', orc.representante_id).single() : Promise.resolve({ data: null }),
        ])
        setCli(c); setItens(it || []); setRep(r.data)
      }
    })()
  }, [id])

  if (!o || !cli) return <div className="spinner" />
  const subtotal = itens.reduce((s, i) => s + Number(i.subtotal || 0), 0)
  const frete = Number(o.valor_frete || 0)
  const freteLabel = o.tipo_frete === 'F' ? 'FOB' : o.tipo_frete

  return (
    <div className="pdf-page">
      <div className="pdf-toolbar no-print">
        <button className="back" style={{ margin: 0 }} onClick={() => nav(-1)}>‹ Voltar</button>
        <button className="btn" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
      </div>

      <div className="doc">
        <header className="doc-head">
          <div className="doc-brand">
            <div className="fu-mark">FU</div>
            <div>
              <div className="fu-name">FUPLASTIC</div>
              <div className="fu-sub">Indústria e Comércio de Plásticos</div>
            </div>
          </div>
          <div className="doc-meta">
            <div className="doc-title">ORÇAMENTO</div>
            <div className="doc-num">Nº {o.numero}</div>
            <div className="doc-date">{dataBR(o.created_at)}</div>
          </div>
        </header>

        <div className="doc-body">
          <div className="two-col">
            <section>
              <h4>Fornecedor</h4>
              <div className="strong">{EMPRESA.fantasia}</div>
              <div style={{ color: '#7a7c72', marginBottom: 6 }}>{EMPRESA.nome}</div>
              <div className="kvp"><span>CNPJ</span><span>{EMPRESA.cnpj}</span></div>
              <div className="kvp"><span>Insc. Estadual</span><span>{EMPRESA.ie}</span></div>
              <div className="kvp"><span>Endereço</span><span>{EMPRESA.endereco}</span></div>
              <div className="kvp"><span>Contato</span><span>{EMPRESA.email}</span></div>
            </section>
            <section>
              <h4>Cliente</h4>
              <div className="strong">{cli.razao_social}</div>
              <div style={{ color: '#7a7c72', marginBottom: 6 }}>{tipoClienteLabel[cli.tipo_cliente]}</div>
              <div className="kvp"><span>CNPJ/CPF</span><span>{cli.cnpj_cpf || '—'}</span></div>
              <div className="kvp"><span>Cidade / UF</span><span>{[cli.cidade, cli.estado].filter(Boolean).join(' / ') || '—'}</span></div>
              <div className="kvp"><span>Telefone</span><span>{cli.telefone || '—'}</span></div>
              <div className="kvp"><span>E-mail</span><span>{cli.email || '—'}</span></div>
            </section>
          </div>

          <table className="doc-table">
            <thead>
              <tr><th>Código</th><th>Descrição</th><th className="num">Qtd</th><th className="num">Valor unit.</th><th className="num">Total</th></tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{i.codigo_inteligente || '—'}</td>
                  <td>{i.descricao || '—'}</td>
                  <td className="num">{Number(i.quantidade)}</td>
                  <td className="num">{brl(i.valor_unitario)}</td>
                  <td className="num">{brl(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="doc-totals">
            <div className="box">
              <div className="kvp"><span>Subtotal dos itens</span><span>{brl(subtotal)}</span></div>
              <div className="kvp"><span>Frete ({freteLabel})</span><span>{frete ? brl(frete) : '—'}</span></div>
              <div className="kvp tot"><span>Total</span><span>{brl(o.valor_total)}</span></div>
            </div>
          </div>

          <div className="three-col">
            <section>
              <h4>Faturamento</h4>
              <div className="kvp"><span>Razão social</span><span>{cli.razao_social}</span></div>
              <div className="kvp"><span>CNPJ/CPF</span><span>{cli.cnpj_cpf || '—'}</span></div>
              <div className="kvp"><span>Insc. Est.</span><span>{cli.inscricao_estadual || '—'}</span></div>
              <div className="kvp"><span>UF</span><span>{cli.estado || '—'}</span></div>
            </section>
            <section>
              <h4>Cobrança</h4>
              <div className="kvp"><span>Pagamento</span><span>{o.condicao_pagamento || '—'}</span></div>
              <div className="kvp"><span>Tipo cliente</span><span>{tipoClienteLabel[cli.tipo_cliente]}</span></div>
              <div className="kvp"><span>Filial</span><span>{EMPRESA.filial}</span></div>
            </section>
            <section>
              <h4>Entrega</h4>
              <div className="kvp"><span>Endereço</span><span>{cli.endereco || [cli.cidade, cli.estado].filter(Boolean).join(' / ') || '—'}</span></div>
              <div className="kvp"><span>Frete</span><span>{freteLabel}</span></div>
              <div className="kvp"><span>Peso bruto</span><span>{o.peso_bruto_total ? o.peso_bruto_total + ' kg' : '—'}</span></div>
            </section>
          </div>

          {(o.obs_pedido || o.obs_nota_fiscal) && (
            <div className="doc-obs">
              {o.obs_pedido && <div><b>Observações:</b> {o.obs_pedido}</div>}
              {o.obs_nota_fiscal && <div style={{ marginTop: 4 }}><b>Nota fiscal:</b> {o.obs_nota_fiscal}</div>}
            </div>
          )}

          <div className="doc-foot">
            <div>
              <div>Orçamento válido por 15 dias a partir da data de emissão.</div>
              <div style={{ marginTop: 2 }}>Vendedor: {rep?.nome || '—'}{rep?.codigo_vendedor_totvs ? ` · cód. ${rep.codigo_vendedor_totvs}` : ''}</div>
            </div>
            <div className="doc-sign"><div className="line" />{EMPRESA.fantasia}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
