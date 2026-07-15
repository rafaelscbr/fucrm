import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'

const GEO = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson'

export default function MapaBrasil({
  markers = [], center = [-51, -27.6], scale = 2100, height = 430,
  showLabels = false, fontSize = 17, ariaLabel = 'Mapa da região Sul',
}) {
  return (
    <ComposableMap projection="geoMercator" projectionConfig={{ center, scale }} height={height}
      style={{ width: '100%', height: 'auto' }} role="img" aria-label={ariaLabel}>
      <ZoomableGroup center={center} zoom={1} minZoom={0.7} maxZoom={6}>
        <Geographies geography={GEO}>
          {({ geographies }) => geographies.map((geo) => (
            <Geography key={geo.rsmKey} geography={geo}
              fill="var(--raised)" stroke="var(--faint)" strokeWidth={0.7}
              style={{ default: { outline: 'none' }, hover: { fill: 'var(--border)', outline: 'none' }, pressed: { outline: 'none' } }} />
          ))}
        </Geographies>
        {markers.map((m, i) => (
          <Marker key={i} coordinates={m.coordinates}>
            <circle r={m.r || 8} fill={m.color || '#00a838'} fillOpacity={0.92} stroke="#fff" strokeWidth={1.6} />
            {showLabels && m.label && (
              <text textAnchor="middle" y={-(m.r || 8) - 8}
                style={{ fontFamily: 'Inter, sans-serif', fontSize, fontWeight: 700, fill: 'var(--text)', paintOrder: 'stroke', stroke: 'var(--bg)', strokeWidth: 5, strokeLinejoin: 'round' }}>
                {m.label}
              </text>
            )}
          </Marker>
        ))}
      </ZoomableGroup>
    </ComposableMap>
  )
}
