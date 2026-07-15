import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'

const GEO = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson'
const SUL = ['Paraná', 'Santa Catarina', 'Rio Grande do Sul']

// Posições de rótulo por "vaga" quando há vizinhos próximos:
// 0=acima · 1=abaixo · 2=direita · 3=esquerda · 4=bem acima · 5=bem abaixo (com linha-guia)
function slotProps(slot, r, fontSize) {
  const gap = 8
  switch (slot) {
    case 1: return { x: 0, y: r + fontSize + 4, anchor: 'middle', line: null }
    case 2: return { x: r + gap, y: fontSize * 0.36, anchor: 'start', line: [r + 2, 0, r + gap - 2, 0] }
    case 3: return { x: -(r + gap), y: fontSize * 0.36, anchor: 'end', line: [-(r + 2), 0, -(r + gap - 2), 0] }
    case 4: return { x: 0, y: -(r + fontSize + 16), anchor: 'middle', line: [0, -(r + 2), 0, -(r + fontSize + 4)] }
    case 5: return { x: 0, y: r + fontSize * 2 + 14, anchor: 'middle', line: [0, r + 2, 0, r + fontSize + 8] }
    default: return { x: 0, y: -(r + gap), anchor: 'middle', line: null }
  }
}

// Distribui rótulos entre as vagas quando os pontos estão próximos (em graus).
function comVagas(markers) {
  const TH = 0.42
  return markers.map((m, i) => {
    let vizinhos = 0
    for (let j = 0; j < i; j++) {
      const dx = m.coordinates[0] - markers[j].coordinates[0]
      const dy = m.coordinates[1] - markers[j].coordinates[1]
      if (Math.hypot(dx, dy) < TH) vizinhos++
    }
    return { ...m, slot: vizinhos % 6 }
  })
}

// Pins exatamente na mesma cidade: afasta lado a lado.
function separarIguais(markers) {
  const grupos = {}
  markers.forEach((m) => { const k = m.coordinates.join(','); (grupos[k] = grupos[k] || []).push(m) })
  const out = []
  Object.values(grupos).forEach((g) => g.forEach((m, i) => out.push({ ...m, px: (i - (g.length - 1) / 2) * 20 })))
  return out
}

export default function MapaBrasil({
  markers = [], center = [-52.4, -28.1], scale = 1750, height = 460,
  showLabels = false, fontSize = 17, ariaLabel = 'Mapa da região Sul do Brasil',
}) {
  const prontos = comVagas(separarIguais(markers))
  return (
    <ComposableMap projection="geoMercator" projectionConfig={{ center, scale }} height={height}
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
          const sp = slotProps(m.slot || 0, r, fontSize)
          return (
            <Marker key={i} coordinates={m.coordinates}>
              <g transform={`translate(${m.px || 0},0)`}>
                {showLabels && m.label && sp.line && (
                  <line x1={sp.line[0]} y1={sp.line[1]} x2={sp.line[2]} y2={sp.line[3]}
                    stroke="var(--muted)" strokeWidth={1.4} />
                )}
                <circle r={r} fill={m.color || '#00a838'} fillOpacity={0.92} stroke="#fff" strokeWidth={1.6} />
                {showLabels && m.label && (
                  <text textAnchor={sp.anchor} x={sp.x} y={sp.y}
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
