import { useEffect, useState } from 'react'
import { api, hora, numero } from './api'
import HourlyChart, { type ForecastPoint } from './HourlyChart'
import Recommendations from './Recommendations'

export type CurrentData = {
  estacion: string
  estado: string
  medicion: (ForecastPoint & { antiguedad_minutos: number }) | null
  horas: ForecastPoint[]
}

export default function Current({ station, label, onData }: { station: string; label: string; onData: (data: CurrentData) => void }) {
  const [data, setData] = useState<CurrentData>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function refresh() {
      try {
        const next = await api<CurrentData>('/actual?' + new URLSearchParams({ estacion: station }))
        if (active) { setData(next); onData(next); setError('') }
      } catch (err) {
        if (active) setError((err as Error).message)
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 5 * 60 * 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [station, onData])

  const forecastPeak = data?.horas.length
    ? data.horas.reduce((peak, point) => point.pm25 > peak.pm25 ? point : peak)
    : undefined
  const isLive = Boolean(data?.medicion && data.medicion.antiguedad_minutos < 180)

  return <div className="current-dashboard">
    <div className="overview-grid">
      <section className="now panel" aria-label="Última medición oficial">
        <div className="reading-heading">
          <span>ESTACIÓN DE MONITOREO · RMCAB</span>
          <span className={`status-pill ${isLive ? 'is-live' : 'is-stale'}`}><i />{isLive ? 'EN VIVO' : data?.estado === 'lectura_atrasada' ? 'LECTURA ATRASADA' : 'SIN LECTURA'}</span>
        </div>
        <div className="reading-value-row">
          {data?.medicion ? <strong className="now-value">{numero.format(data.medicion.pm25)} <small>µg/m³</small></strong>
            : <strong className="now-value">— <small>µg/m³</small></strong>}
          <span className="reading-caption">Material particulado fino PM2,5</span>
        </div>
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p role="status">Consultando la red de monitoreo…</p>}
        {data?.medicion && <p className="reading-source">{label} · {hora(data.medicion.hora)} · Bogotá</p>}
        {data?.estado === 'sin_lectura' && <p className="reading-source">La red todavía no tiene una lectura reciente para esta estación.</p>}
        {data?.estado === 'lectura_atrasada' && <p className="reading-source">La última lectura lleva más de tres horas sin actualizarse.</p>}
        <div className="live-metrics">
          <div><span>ÚLTIMA ACTUALIZACIÓN</span><strong>{data?.medicion ? `${data.medicion.antiguedad_minutos} min` : '—'}</strong>
            <small>{data?.medicion ? 'desde la lectura oficial' : 'sin datos recientes'}</small></div>
          <div><span>MÁXIMO PREVISTO · 24 H</span><strong>{forecastPeak ? `${numero.format(forecastPeak.pm25)} µg/m³` : '—'}</strong>
            <small>{forecastPeak ? `estimado a las ${hora(forecastPeak.hora)}` : 'pronóstico no disponible'}</small></div>
        </div>
      </section>
      <Recommendations data={data} />
    </div>

    <section className="forecast-panel panel" aria-label="Pronóstico para las próximas 24 horas">
      <div className="forecast-heading"><div><span className="eyebrow">MODELO · PRONÓSTICO HORARIO</span><h2>Próximas 24 horas</h2></div>
        <span className="forecast-unit">PM2,5 · µg/m³</span></div>
      {data?.horas.length && data.medicion ? <>
        <HourlyChart reading={data.medicion} forecast={data.horas} />
        <p className="forecast-note">La estimación puede diferir de la medición posterior y subestimar picos de contaminación.</p>
      </> : <p>{data ? 'Por ahora no hay un pronóstico disponible para esta estación.' : 'Cargando pronóstico…'}</p>}
    </section>
  </div>
}
