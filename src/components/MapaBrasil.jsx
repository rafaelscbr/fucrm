import { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoMercator } from 'd3-geo'

const GEO = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson'
const SUL = ['Paraná', 'Santa Catarina', 'Rio Grande do Sul']
const W = 800

const rct = (x, y, w, h) => ({ x, y, w, h })
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// Posiciona rótulos SEM sobreposição: calcula tudo em pixels (projeção real),
// testa 10 posições candidatas por rótulo e usa linha-guia quando afasta.
function montarLayout(markers, center, scale, height, fontSize) {
  const proj = geoMercator().center(center).scale(scale).translate([W / 2, height / 2])

  // pins na mesma cidade: afasta lado a lado
  const grupos = {}
  markers.forEach((m) => { const k = m.coordinates.join(','); (grupos[k] = grupos[k] || []).push(m) })
  const pins = []
  Object.values(grupos).forEach((g) => g.forEach((m, i) => {
    const p = proj(m.coordinates) || [0, 0]
    const shift = (i - (g.length - 1) / 2) * ((m.r || 8) * 2 + 8)
    pins.push({ ...m, gx: p[0] + shift, gy: p[1], shift })
  }))

  pins.sort((a, b) => (b.r || 8) - (a.r || 8))          // maiores primeiro
  const ocupados = pins.map((p) => { const r = (p.r || 8) + 3; return rct(p.gx - r, p.gy - r, r * 2, r * 2) })

  return pins.map((p) => {
    if (!p.label) return { ...p, lab: null }
    const r = p.r || 8
    const w = p.label.length * fontSize * 0.60 + 8
    const h = fontSize * 1.3
    const cands = [
      { dx: 0, dy: -(r + 8), a: 'middle', lead: false },
      { dx: 0, dy: r + 8 + h * 0.72, a: 'middle', lead: false },
      { dx: r + 9, dy: h * 0.28, a: 'start', lead: false },
      { dx: -(r + 9), dy: h * 0.28, a: 'end', lead: false },
      { dx: w * 0.45, dy: -(r + 6 + h), a: 'middle', lead: true },
      { dx: -w * 0.45, dy: -(r + 6 + h), a: 'middle', lead: true },
      { dx: w * 0.45, dy: r + 12 + h, a: 'middle', lead: true },
      { dx: -w * 0.45, dy: r + 12 + h, a: 'middle', lead: true },
      { dx: 0, dy: -(r + 12 + h * 2), a: 'middle', lead: true },
      { dx: 0, dy: r + 16 + h * 2.2, a: 'middle', lead: true },
    ]
    let esc = null
    for (const c of cands) {
      const lx = p.gx + c.dx
      const box = c.a === 'middle' ? rct(lx - w / 2, p.gy + c.dy - h * 0.8, w, h)
        : c.a === 'start' ? rct(lx, p.gy + c.dy - h * 0.8, w, h)
        : rct(lx - w, p.gy + c.dy - h * 0.8, w, h)
      if (!ocupados.some((o) => hit(o, box))) { esc = { ...c, box }; break }
    }
    if (!esc) { const c = cands[8]; esc = { ...c, box: rct(p.gx - w / 2, p.gy + c.dy - h * 0.8, w, h) } }
    ocupados.push(esc.box)
    return { ...p, lab: esc }
  })
}

export default function MapaBrasil({
  markers = [], center = [-52.4, -28.1], scale = 1750, height = 470,
  showLabels = false, fontSize = 16, ariaLabel = 'Mapa da região Sul do Brasil',
}) {
  const prontos = useMemo(() => montarLayout(markers, center, scale, height, fontSize),
    [markers, center, scale, height, fontSize])

  return (
    <ComposableMap width={W} projection="geoMercator" projectionConfig={{ center, scale }} height={height}
      style={{ width: '100%', height: 'auto' }} role="img" aria-label={ariaLabel}>
      <ZoomableGroup center={center} zoom={1} minZoom={0.7} maxZoom={7}>
        <Geographies geography={GEO}>
          {({ geographies }) => geographies.map((geo) => {
            const ehSul = SUL.includes(geo.properties.name)
            return (
              <Geography key={geo.rsmKey} geography={geo}
                fill={ehSul ? 'var(--accent-soft)' : 'var(--sunk)'}
                stroke={ehSul ? 'var(--accent-text)' : 'var(--border)'}
                strokeWidth={ehSul ? 1 : 0.5}
                style={{ default: { outline: 'none' }, hover: { fill: ehSul ? 'var(--accent-soft)' : 'var(--border)', outline: 'none' }, pressed: { outline: 'none' } }} />
            )
          })}
        </Geographies>
        {prontos.map((m, i) => {
          const r = m.r || 8
          return (
            <Marker key={i} coordinates={m.coordinates}>
              <g transform={`translate(${m.shift || 0},0)`}>
                {showLabels && m.lab && m.lab.lead && (
                  <line x1={0} y1={m.lab.dy < 0 ? -r - 1 : r + 1}
                    x2={m.lab.dx * 0.85} y2={m.lab.dy + (m.lab.dy < 0 ? 5 : -fontSize * 0.85)}
                    stroke="var(--muted)" strokeWidth={1.3} />
                )}
                <circle r={r} fill={m.color || '#00a838'} fillOpacity={0.94} stroke="#fff" strokeWidth={1.6} />
                {showLabels && m.lab && (
                  <text textAnchor={m.lab.a} x={m.lab.dx} y={m.lab.dy}
                    style={{ fontFamily: 'Inter, sans-serif', fontSize, fontWeight: 700, fill: 'var(--text)', paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 5, strokeLinejoin: 'round' }}>
                    {m.label}
                  </text>
                )}
              </g>
            </Marker>
          )
        })}
      </ZoomableGroup>
    </ComposableMap>
  )
}
