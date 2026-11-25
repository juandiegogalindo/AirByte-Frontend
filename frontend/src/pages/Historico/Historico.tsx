import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import "../Current/Current.css";
import { ErrorNotice, Skeleton } from '../Estados/Estados'
import { hora, numero } from '../../utils/format'
import './Historico.css'
import { nivelPm25 } from '../../utils/nivel'
import type { Result, Station } from '../../types/types'

const etiquetaMes = (mes: string) => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(`${mes}-01T12:00:00Z`))
const etiquetaDia = (dia: string) => new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  .format(new Date(`${dia}T12:00:00Z`))
const horaCorta = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Bogota' })
const NIVEL = { baja: 'BAJO', intermedia: 'INTERMEDIO', alta: 'ALTO', 'sin-dato': 'SIN DATO' }

function Resultado({ result }: { result: Result }) {
  const medicion = result.medicion?.pm25 ?? null
  const pronostico = result.pronostico?.pm25 ?? null
  const observado = result.evaluacion?.pm25_observado ?? null
  const tope = Math.max(medicion ?? 0, pronostico ?? 0, observado ?? 0, 1)
  const tarjetas = [
    { titulo: result.medicion?.antiguedad_minutos ? 'Última medición disponible' : 'Medición oficial', valor: medicion,
      nota: result.medicion ? `${hora(result.medicion.hora)}${result.medicion.antiguedad_minutos > 0 ? ` · ${result.medicion.antiguedad_minutos} min antes de la emisión` : ''}` : 'Sin lectura previa' },
    { titulo: 'Pronóstico a 24 horas', valor: pronostico, nota: result.pronostico ? hora(result.pronostico.hora) : 'Sin pronóstico para esta hora' },
    ...(result.evaluacion ? [{ titulo: 'Observado 24 horas después', valor: observado, nota: observado === null ? `Sin lectura el ${hora(result.evaluacion.hora_observada)}` : hora(result.evaluacion.hora_observada) }] : []),
  ]
  const diferencia = pronostico !== null && observado !== null ? pronostico - observado : null
  return <div className="hist-results" aria-live="polite">
    <p className="hist-note">Emisión histórica · {hora(result.emision)}</p>
    {result.estado === 'sin_medicion_en_emision' && <p className="empty-state">No hay una medición exacta en esa hora, por eso el modelo no generó pronóstico. Prueba con otra hora.</p>}
    <div className="hist-grid">
      {tarjetas.map(({ titulo, valor, nota }) => {
        const nivel = nivelPm25(valor ?? undefined)
        return <div className="hist-card" key={titulo}>
          <h3>{titulo}</h3>
          <strong className="hist-value">{valor === null ? '—' : numero.format(valor)}<small>µg/m³</small></strong>
          {valor !== null && <span className={`level-badge is-${nivel}`}>{NIVEL[nivel]}</span>}
          <div className="hist-bar" aria-hidden="true"><i className={`is-${nivel}`} style={{ width: `${((valor ?? 0) / tope) * 100}%` }} /></div>
          <p>{nota}</p>
        </div>
      })}
    </div>
    {diferencia !== null && <p className="hist-summary">
      El modelo estimó <strong>{numero.format(pronostico!)} µg/m³</strong> y se observaron <strong>{numero.format(observado!)} µg/m³</strong>: {Math.abs(diferencia) < 0.05 ? 'prácticamente coincidieron' : diferencia < 0 ? `se quedó ${numero.format(-diferencia)} µg/m³ por debajo` : `se pasó ${numero.format(diferencia)} µg/m³ por encima`}.
    </p>}
    <p className="hist-note">El modelo tiende a subestimar picos de concentración.</p>
  </div>
}

export default function Historico({ station, stations, onStation }: { station: string; stations: Station[]; onStation: (slug: string) => void }) {
  const [month, setMonth] = useState('2025-01')
  const [months, setMonths] = useState<string[]>([])
  const [monthsReady, setMonthsReady] = useState(false)
  const [available, setAvailable] = useState<string[]>([])
  const [loadingHours, setLoadingHours] = useState(false)
  const [loaded, setLoaded] = useState('')
  const [time, setTime] = useState('')
  const [evaluate, setEvaluate] = useState(true)
  const [result, setResult] = useState<Result>()
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [intento, setIntento] = useState(0)
  const requestId = useRef(0)

  useEffect(() => {
    let active = true
    setMonthsReady(false)
    setMonths([])
    setAvailable([])
    setLoaded('')
    setTime('')
    setLoadError('')
    setResult(undefined)
    api<{ meses: string[] }>('/estaciones/' + station + '/disponibilidad')
      .then(data => {
        if (!active) return
        setMonths(data.meses)
        setMonth(current => data.meses.includes(current) ? current : (data.meses[data.meses.length - 1] ?? ''))
      }).catch(e => { if (active) setLoadError((e as Error).message) })
      .finally(() => { if (active) setMonthsReady(true) })
    return () => { active = false }
  }, [station, intento])

  useEffect(() => {
    if (!monthsReady || !month || !months.includes(month)) return
    let active = true
    setLoadingHours(true)
    setAvailable([])
    setTime('')
    setLoadError('')
    setResult(undefined)
    api<{ horas: string[] }>('/estaciones/' + station + '/disponibilidad?mes=' + month)
      .then(data => {
        if (!active) return
        setAvailable(data.horas)
        setTime(data.horas[0] ?? '')
      }).catch(e => { if (active) setLoadError((e as Error).message) })
      .finally(() => { if (active) { setLoadingHours(false); setLoaded(`${station}|${month}`) } })
    return () => { active = false }
  }, [station, month, monthsReady, months])

  async function consult() {
    const id = ++requestId.current
    const params = new URLSearchParams({ estacion: station, emision: time, evaluar: String(evaluate) })
    setBusy(true)
    setError('')
    setResult(undefined)
    try {
      const data = await api<Result>('/consulta?' + params)
      if (id === requestId.current) setResult(data)
    } catch (e) { if (id === requestId.current) setError((e as Error).message) }
    finally { if (id === requestId.current) setBusy(false) }
  }

  const days = [...new Set(available.map(value => value.slice(0, 10)))]
  const day = time.slice(0, 10)
  const hours = available.filter(value => value.startsWith(day))
  const sinMeses = monthsReady && !months.length && !loadError
  const sinHoras = loaded === `${station}|${month}` && !available.length && !loadError

  return <section className="historical-panel panel" aria-label="Consulta histórica" aria-busy={!monthsReady || loadingHours}>
    <div className="hist-heading">
      <span className="eyebrow">MODELO · EVALUACIÓN HISTÓRICA</span>
      <h2>¿Qué habría pronosticado el modelo?</h2>
      <p>Elige un momento del pasado: verás la medición de ese instante, lo que el modelo estimó para 24 horas después y, si quieres, lo que realmente se observó.</p>
    </div>
    <form className="filters" onSubmit={event => { event.preventDefault(); void consult() }}>
      <label>Estación<select value={station} onChange={event => onStation(event.target.value)}>
        {stations.map(item => <option key={item.slug} value={item.slug}>{item.nombre}</option>)}
      </select></label>
      <label>Mes<select required value={month} disabled={!monthsReady || !months.length}
        onChange={event => setMonth(event.target.value)}>
        {!months.length && <option value="">{monthsReady ? 'Sin histórico disponible' : 'Buscando meses…'}</option>}
        {months.map(value => <option key={value} value={value}>{etiquetaMes(value)}</option>)}
      </select></label>
      <label>Día<select value={day} disabled={!days.length || loadingHours}
        onChange={event => { setResult(undefined); setTime(available.find(value => value.startsWith(event.target.value)) ?? '') }}>
        {!days.length && <option value="">{loadingHours ? 'Buscando días…' : 'Sin días disponibles'}</option>}
        {days.map(value => <option key={value} value={value}>{etiquetaDia(value)}</option>)}
      </select></label>
      <label>Hora (Bogotá)<select value={time} disabled={!hours.length || loadingHours}
        onChange={event => { setResult(undefined); setTime(event.target.value) }}>
        {!hours.length && <option value="">{loadingHours ? 'Buscando horas…' : 'Sin horas disponibles'}</option>}
        {hours.map(value => <option key={value} value={value}>{horaCorta.format(new Date(value))}</option>)}
      </select></label>
      <button disabled={!available.length || !time || busy || loadingHours}>{busy ? 'Consultando…' : 'Consultar'}</button>
      <label className="check"><input type="checkbox" checked={evaluate} onChange={event => setEvaluate(event.target.checked)} /> Comparar con lo observado 24 h después</label>
    </form>
    {loadError && <ErrorNotice message={loadError} onRetry={() => setIntento(value => value + 1)} />}
    {!monthsReady && <p role="status" className="hist-note">Buscando meses con datos históricos…</p>}
    {sinMeses && <p className="empty-state">Todavía no hay datos históricos cargados para esta estación.</p>}
    {sinHoras && <p className="empty-state">No hay lecturas de PM2,5 en {etiquetaMes(month)} para esta estación.</p>}
    {error && <ErrorNotice message={error} onRetry={() => void consult()} />}
    {busy && <Skeleton width="100%" height="9rem" />}
    {!result && !busy && !error && available.length > 0 && <p className="hist-note">Elige un día y una hora y pulsa Consultar.</p>}
    {result && <Resultado result={result} />}
  </section>
}
