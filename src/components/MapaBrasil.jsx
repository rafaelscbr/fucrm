import { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { geoMercator } from 'd3-geo'

const GEO = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson'
const SUL = ['Paraná', 'Santa Catarina', 'Rio Grande do Sul']
const UFS = [
  { sigla: 'PR', coordinates: [-51.8, -24.7] },
  { sigla: 'SC', coordinates: [-51.3, -27.15] },
  { sigla: 'RS', coordinates: [-54.2, -29.9] },
]
const W = 800

const rct = (x, y, w, h) => ({ x, y, w, h })
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// Layout de rótulos: testa posições candidatas; se não couber sem colidir,
// força a mais afastada (force=true) ou OCULTA o rótulo (force=false — a lista lateral cobre).
function montarLayout(markers, center, scale, height, fontSize, force) {
  const proj = geoMercator().center(center).scale(scale).translate([W / 2, height / 2])
  const grupos = {}
  markers.forEach((m) => { const k = m.coordinates.join(','); (grupos[k] = grupos[k] || []).push(m) })
  const pins = []
  Object.values(grupos).forEach((g) => g.forEach((m, i) => {
    const p = proj(m.coordinates) || [0, 0]
    const shift = (i - (g.length - 1) / 2) * ((m.r || 9) * 2 + 8)
    pins.push({ ...m, gx: p[0] + shift, gy: p[1], shift })
  }))
  pins.sort((a, b) => (b.r || 9) - (a.r || 9))
  const ocupados = pins.map((p) => { const r = (p.r || 9) + 3; return rct(p.gx - r, p.gy - r, r * 2, r * 2) })
  return pins.map((p) => {
    if (!p.label) return { ...p, lab: null }
    const r = p.r || 9
    const w = p.label.length * fontSize * 0.62 + 8
    const h = fontSize * 1.3
    const cands = [
      { dx: 0, dy: -(r + 7), a: 'middle' }, { dx: 0, dy: r + 7 + h * 0.72, a: 'middle' },
      { dx: r + 8, dy: h * 0.28, a: 'start' }, { dx: -(r + 8), dy: h * 0.28, a: 'end' },
      { dx: 0, dy: -(r + 9 + h), a: 'middle' }, { dx: 0, dy: r + 13 + h, a: 'middle' },
    ]
    let esc = null
    for (const c of cands) {
      const lx = p.gx + c.dx
      const box = c.a === 'middle' ? rct(lx - w / 2, p.gy + c.dy - h * 0.8, w, h)
        : c.a === 'start' ? rct(lx, p.gy + c.dy - h * 0.8, w, h) : rct(lx - w, p.gy + c.dy - h * 0.8, w, h)
      if (!ocupados.some((o) => hit(o, box))) { esc = { ...c, box }; break }
    }
    if (!esc) {
      if (!force) return { ...p, lab: null }             // sem espaço → oculta (lista cobre)
      const c = cands[4]; esc = { ...c, box: rct(p.gx - w / 2, p.gy + c.dy - h * 0.8, w, h) }
    }
    ocupados.push(esc.box)
    return { ...p, lab: esc }
  })
}

export default function MapaBrasil({
  markers = [], mode = 'num', center = [-52.4, -28.1], scale = 1750, height = 500,
  fontSize = 14, ariaLabel = 'Mapa da região Sul do Brasil',
}) {
  const prontos = useMemo(
    () => montarLayout(markers, center, scale, height, fontSize, mode === 'label'),
    [markers, mode, center, scale, height, fontSize],
  )

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

        {UFS.map((u) => (
          <Marker key={u.sigla} coordinates={u.coordinates}>
            <text textAnchor="middle"
              style={{ fontFamily: 'Sora, Inter, sans-serif', fontSize: 30, fontWeight: 800, fill: 'var(--faint)', opacity: 0.42, letterSpacing: 3 }}>
              {u.sigla}
            </text>
          </Marker>
        ))}

        {prontos.map((m, i) => {
          const r = m.r || (mode === 'num' ? 11 : 9)
          return (
            <Marker key={i} coordinates={m.coordinates}>
              <g transform={`translate(${m.shift || 0},0)`}>
                <circle r={r} fill={m.color || '#00a838'} fillOpacity={0.94} stroke="#fff" strokeWidth={1.8} />
                {mode === 'num' && m.num != null && (
                  <text textAnchor="middle" dy="0.35em"
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: r >= 14 ? 13 : 11, fontWeight: 800, fill: '#fff' }}>
                    {m.num}
                  </text>
                )}
                {m.lab && (
                  <text textAnchor={m.lab.a} x={m.lab.dx} y={m.lab.dy}
                    style={{ fontFamily: 'Inter, sans-serif', fontSize, fontWeight: 700, fill: 'var(--text)', paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 4.5, strokeLinejoin: 'round' }}>
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
