import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson'

export default function MapaBrasil({ markers = [], center = [-50.8, -27.4], scale = 2600, height = 330, showLabels = false }) {
  return (
    <ComposableMap projection="geoMercator" projectionConfig={{ center, scale }} height={height} style={{ width: '100%', height: 'auto' }}>
      <Geographies geography={GEO}>
        {({ geographies }) => geographies.map((geo) => (
          <Geography key={geo.rsmKey} geography={geo}
            fill="var(--raised)" stroke="var(--faint)" strokeWidth={0.5}
            style={{ default: { outline: 'none' }, hover: { fill: 'var(--border)', outline: 'none' }, pressed: { outline: 'none' } }} />
        ))}
      </Geographies>
      {markers.map((m, i) => (
        <Marker key={i} coordinates={m.coordinates}>
          <circle r={m.r || 5} fill={m.color || '#00c53a'} fillOpacity={0.85} stroke="#fff" strokeWidth={0.6} />
          {showLabels && m.label && (
            <text textAnchor="middle" y={-(m.r || 5) - 4}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700, fill: 'var(--text)', paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 2.5 }}>
              {m.label}
            </text>
          )}
        </Marker>
      ))}
    </ComposableMap>
  )
}
