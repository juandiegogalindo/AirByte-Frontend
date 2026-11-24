import type { CurrentData } from './Current'
import { hora, numero } from './api'

type Station = { slug: string; nombre: string; localidad: string; localidad_nombre?: string; latitud: number; longitud: number }
const localityLabels: Record<string, string> = {
  kennedy: 'Kennedy', 'puente-aranda': 'Puente Aranda', tunjuelito: 'Tunjuelito', usaquen: 'Usaquén',
}

export default function StationDetail({ station, data, onPin, pinned }: {
  station?: Station; data?: CurrentData; onPin: () => void; pinned: boolean
}) {
  const reading = data?.medicion
  const hourly = data?.horas ?? []
  const low = hourly.length ? hourly.reduce((best, item) => item.pm25 < best.pm25 ? item : best) : undefined
  const high = hourly.length ? hourly.reduce((best, item) => item.pm25 > best.pm25 ? item : best) : undefined
  const next = hourly[0]
  const delta = next && reading ? next.pm25 - reading.pm25 : undefined
  const locality = station?.localidad_nombre ?? localityLabels[station?.localidad ?? '']

  return <aside className="map-station-details" aria-label="Ficha de la estación seleccionada">
    <div className="detail-eyebrow"><span>FICHA TÉCNICA DE SECTOR</span><span>RMCAB · LOCAL</span></div>
    <h3>{station?.nombre ?? 'Estación seleccionada'}</h3>
    <p className="detail-locality">{locality ? `Localidad ${locality}` : 'Red de monitoreo de Bogotá'}</p>
    <div className="detail-reading">
      <span>CONCENTRACIÓN PM2,5</span>
      <strong>{reading ? numero.format(reading.pm25) : '—'}<small> µg/m³</small></strong>
      <span className="detail-reading-note">{reading ? `Última lectura · ${hora(reading.hora)}` : 'Sin lectura reciente'}</span>
    </div>
    <div className="detail-facts">
      <div><span>Tendencia próxima hora</span><strong className={delta === undefined ? '' : delta <= 0 ? 'trend-down' : 'trend-up'}>
        {delta === undefined ? '—' : `${delta > 0 ? '+' : ''}${numero.format(delta)} µg/m³`}</strong></div>
      <div><span>Mínimo estimado · 24 h</span><strong>{low ? `${numero.format(low.pm25)} µg/m³ · ${hora(low.hora)}` : '—'}</strong></div>
      <div><span>Máximo estimado · 24 h</span><strong>{high ? `${numero.format(high.pm25)} µg/m³ · ${hora(high.hora)}` : '—'}</strong></div>
    </div>
    <button className={`pin-station${pinned ? ' is-pinned' : ''}`} type="button" onClick={onPin} disabled={!station}>
      {pinned ? '✓ Estación principal' : '⌖ Fijar como estación principal'}
    </button>
    {station && <small className="station-coordinates">{station.latitud.toFixed(4)}° N · {Math.abs(station.longitud).toFixed(4)}° O</small>}
  </aside>
}
