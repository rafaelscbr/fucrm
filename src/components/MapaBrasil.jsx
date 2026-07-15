import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson'

export default function MapaBrasil({ markers = [], center = [-50.8, -27.4], scale = 2600, height = 340, showLabels = false, ariaLabel = 'Mapa da região Sul' }) {
  return (
    <ComposableMap projection="geoMercator" projectionConfig={{ center, scale }} height={height}
      style={{ width: '100%', height: 'auto' }} role="img" aria-label={ariaLabel}>
      <Geographies geography={GEO}>
        {({ geographies }) => geographies.map((geo) => (
          <Geography key={geo.rsmKey} geography={geo}
            fill="var(--raised)" stroke="var(--faint)" strokeWidth={0.7}
            style={{ default: { outline: 'none' }, hover: { fill: 'var(--border)', outline: 'none' }, pressed: { outline: 'none' } }} />
        ))}
      </Geographies>
      {markers.map((m, i) => (
        <Marker key={i} coordinates={m.coordinates}>
          <circle r={m.r || 6} fill={m.color || '#00c53a'} fillOpacity={0.9} stroke="#fff" strokeWidth={1.1} />
          {showLabels && m.label && (
            <text textAnchor="middle" y={-(m.r || 6) - 6}
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, fill: 'var(--text)', paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 4, strokeLinejoin: 'round' }}>
              {m.label}
            </text>
          )}
        </Marker>
      ))}
    </ComposableMap>
  )
}
