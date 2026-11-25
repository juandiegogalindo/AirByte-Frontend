import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { ErrorNotice, Skeleton } from '../Estados/Estados'
import { hora, numero } from '../../utils/format'
import HourlyChart, { type ForecastPoint } from '../../components/charts/HourlyChart'
import LevelScale from '../../components/LevelScale'
import Recommendations from '../../components/Recommendations'
import Sparkline from '../../components/charts/Sparkline'

export type CurrentData = {
  estacion: string
  estado: string
  medicion: (ForecastPoint & { antiguedad_minutos: number }) | null
  horas: ForecastPoint[]
}

export default function Current({ station, label, onData }: { station: string; label: string; onData: (data: CurrentData) => void }) {
  const [data, setData] = useState<CurrentData>()
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const [lento, setLento] = useState(false)
  useEffect(() => {
    let active = true
    const aviso = window.setTimeout(() => setLento(true), 8000)
    async function refresh() {
      try {
        const next = await api<CurrentData>('/actual?' + new URLSearchParams({ estacion: station }))
        if (active) { setData(next); onData(next); setError(''); setLento(false) }
      } catch (err) {
        if (active) setError((err as Error).message)
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 5 * 60 * 1000)
    return () => { active = false; window.clearTimeout(aviso); window.clearInterval(timer) }
  }, [station, onData, intento])

  function reintentar() {
    setError('')
    setLento(false)
    setIntento(value => value + 1)
  }

  const cargando = !data && !error
  const forecastPeak = data?.horas.length
    ? data.horas.reduce((peak, point) => point.pm25 > peak.pm25 ? point : peak)
    : undefined
  const isLive = Boolean(data?.medicion && data.medicion.antiguedad_minutos < 180)
  const pill = cargando ? { clase: 'is-loading', texto: 'CONSULTANDO' }
    : isLive ? { clase: 'is-live', texto: 'EN VIVO' }
    : { clase: 'is-stale', texto: error && !data ? 'SIN CONEXIÓN' : data?.estado === 'lectura_atrasada' ? 'LECTURA ATRASADA' : 'SIN LECTURA' }
  const metrica = (valor: string, detalle: string) => cargando
    ? <><Skeleton width="5rem" height="1.2rem" /><Skeleton width="8rem" height=".7rem" /></>
    : <><strong>{valor}</strong><small>{detalle}</small></>

  return <div className="current-dashboard">
    <div className="overview-grid">
      <section className="now panel" aria-label="Última medición oficial" aria-busy={cargando}>
        <div className="reading-heading">
          <span>ESTACIÓN DE MONITOREO · RMCAB</span>
          <span className={`status-pill ${pill.clase}`}><i />{pill.texto}</span>
        </div>
        <div className="reading-value-row">
          <strong className="now-value">{cargando ? <Skeleton width="2.6em" height=".8em" /> : data?.medicion ? numero.format(data.medicion.pm25) : '—'}<small>µg/m³</small></strong>
        </div>
        <LevelScale loading={cargando} value={isLive ? data?.medicion?.pm25 : undefined} caption="Material particulado fino PM2,5" />
        {cargando ? <Skeleton width="100%" height="3.6rem" />
          : data?.horas.length && data.medicion ? <Sparkline reading={data.medicion} forecast={data.horas} /> : null}
        {error && <ErrorNotice message={error} onRetry={reintentar} />}
        {cargando && <p role="status" className="reading-source">Consultando la red de monitoreo…{lento && ' El servidor puede tardar en despertar; sigue intentando.'}</p>}
        {data?.medicion && <p className="reading-source">{label} · {hora(data.medicion.hora)} · Bogotá</p>}
        {data?.estado === 'sin_lectura' && <p className="reading-source">La red todavía no tiene una lectura reciente para esta estación.</p>}
        {data?.estado === 'lectura_atrasada' && <p className="reading-source">La última lectura lleva más de tres horas sin actualizarse.</p>}
        <div className="live-metrics">
          <div><span>ÚLTIMA ACTUALIZACIÓN</span>
            {metrica(data?.medicion ? `${data.medicion.antiguedad_minutos} min` : '—', data?.medicion ? 'desde la lectura oficial' : 'sin datos recientes')}</div>
          <div><span>MÁXIMO PREVISTO · 24 H</span>
            {metrica(forecastPeak ? `${numero.format(forecastPeak.pm25)} µg/m³` : '—', forecastPeak ? `estimado a las ${hora(forecastPeak.hora)}` : 'pronóstico no disponible')}</div>
        </div>
      </section>
      <Recommendations data={data} loading={cargando} />
    </div>

    <section className="forecast-panel panel" aria-label="Pronóstico para las próximas 24 horas" aria-busy={cargando}>
      <div className="forecast-heading"><div><span className="eyebrow">MODELO · PRONÓSTICO HORARIO</span><h2>Próximas 24 horas</h2></div>
        <span className="forecast-unit">PM2,5 · µg/m³</span></div>
      {data?.horas.length && data.medicion ? <>
        <HourlyChart reading={data.medicion} forecast={data.horas} />
        <p className="forecast-note">La estimación puede diferir de la medición posterior y subestimar picos de contaminación.</p>
      </> : cargando ? <Skeleton width="100%" height="11rem" />
        : <p>{data ? 'Por ahora no hay un pronóstico disponible para esta estación.' : 'El pronóstico no está disponible mientras falla la conexión.'}</p>}
    </section>
  </div>
}
