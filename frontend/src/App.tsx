import { useEffect, useState } from 'react'
import { api } from './api'
import { ErrorNotice } from './Estados'
import type { Station } from './types'
import Current, { type CurrentData } from './Current'
import Historico from './Historico'
import LocalityMap, { MapLegend } from './LocalityMap'
import StationDetail from './StationDetail'
import { SiteFooter, SiteHeader } from './SiteChrome'
import './App.css'

const localityLabels: Record<string, string> = {
  kennedy: 'Kennedy', 'puente-aranda': 'Puente Aranda', tunjuelito: 'Tunjuelito', usaquen: 'Usaquén',
}

function preferredStation() {
  try { return localStorage.getItem('airbyte-estacion') || 'tunal' }
  catch { return 'tunal' }
}

export default function App() {
  const [historical, setHistorical] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [station, setStation] = useState(preferredStation)
  const [pinnedStation, setPinnedStation] = useState(preferredStation)
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentData, setCurrentData] = useState<CurrentData>()
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api<{ resultados: Station[] }>('/estaciones').then(data => {
      if (!active) return
      setStations(data.resultados)
      const fallback = data.resultados.find(item => item.slug === 'tunal')?.slug ?? data.resultados[0]?.slug ?? 'tunal'
      setStation(current => data.resultados.some(item => item.slug === current) ? current : fallback)
      setPinnedStation(current => data.resultados.some(item => item.slug === current) ? current : '')
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [])

  const selected = stations.find(item => item.slug === station)
  const stationData = currentData?.estacion === station ? currentData : undefined
  const live = Boolean(stationData?.medicion && stationData.medicion.antiguedad_minutos < 180)

  function changeStation(slug: string) {
    setCurrentData(undefined)
    setStation(slug)
  }

  function pinStation() {
    try { localStorage.setItem('airbyte-estacion', station) } catch { /* El cambio sigue activo en esta página. */ }
    setPinnedStation(station)
  }

  return <>
    <SiteHeader />
    <main className="dashboard-main">
      <section id="consulta" aria-labelledby="dashboard-title">
        <h1 className="visually-hidden" id="dashboard-title">Calidad del aire en Bogotá</h1>
        {error && <ErrorNotice message={error} />}
        <div className="station-strip">
          <label className="station-picker"><span className="station-picker-label">Estación de monitoreo</span>
            <select value={station} onChange={event => changeStation(event.target.value)}>
              {stations.map(item => <option key={item.slug} value={item.slug}>{item.nombre}</option>)}
            </select>
          </label>
          <div className="station-live" aria-live="polite"><span className={`live-dot ${live ? '' : 'is-offline'}`} />
            <span><strong>{live ? 'RMCAB · EN VIVO' : stationData?.estado === 'lectura_atrasada' ? 'RMCAB · LECTURA ATRASADA' : stationData?.estado === 'modelo_no_disponible' ? 'RMCAB · MODELO NO DISPONIBLE' : 'RMCAB · CONSULTANDO'}</strong>
              <small>{stationData?.medicion ? `Último dato · hace ${stationData.medicion.antiguedad_minutos} min` : 'Red de monitoreo de Bogotá'}</small></span>
          </div>
          <div className="station-facts">
            <span><small>LOCALIDAD</small><strong>{selected?.localidad_nombre ?? localityLabels[selected?.localidad ?? ''] ?? 'Bogotá D.C.'}</strong></span>
            <span><small>FUENTE</small><strong>RMCAB</strong></span>
            <span><small>PRONÓSTICO</small><strong>24 HORAS</strong></span>
          </div>
          <button className="refresh-button" type="button" aria-label="Actualizar medición" title="Actualizar medición"
            onClick={() => { setCurrentData(undefined); setRefreshKey(value => value + 1) }}>
            <span aria-hidden="true">⟳</span>
          </button>
        </div>

        <div className="view-toolbar">
          <span className="view-toolbar-label">Calidad del aire · Bogotá D.C.</span>
          <div className="mode-switch" role="tablist" aria-label="Vista de calidad del aire">
            <button role="tab" aria-selected={!historical} aria-pressed={!historical} onClick={() => setHistorical(false)}>En vivo</button>
            <button role="tab" aria-selected={historical} aria-pressed={historical} onClick={() => setHistorical(true)}>Histórico</button>
          </div>
        </div>

        {!historical ? <Current key={`${station}-${refreshKey}`} station={station} label={selected?.nombre ?? 'Tunal'} onData={setCurrentData} />
          : <Historico station={station} stations={stations} onStation={changeStation} />}

        <section className="pm25-explainer panel" aria-labelledby="pm25-title">
          <h2 id="pm25-title">¿Qué es PM2,5 y por qué importa?</h2>
          <p>PM2,5 son partículas suspendidas en el aire de 2,5 micrómetros o menos, generadas por fuentes como el humo y la combustión. Por su tamaño pueden llegar profundo a los pulmones y pasar al torrente sanguíneo, con efectos respiratorios y cardiovasculares.</p>
          <p>Niños, personas mayores y quienes tienen enfermedades del corazón o los pulmones pueden ser más sensibles. Revisa la lectura antes de salir y sigue la información oficial de Bogotá cuando suba la contaminación. <a href="https://www.who.int/news/item/25-06-2024-what-are-health-consequences-of-air-pollution-on-populations" target="_blank" rel="noreferrer">Fuente: OMS ↗</a></p>
        </section>

        <section className="map-panel panel" aria-labelledby="map-title">
          <div className="map-heading">
            <div><span className="eyebrow">AIR-BYTE · BOGOTÁ D.C.</span><h2 id="map-title">Cartografía de partículas por localidad</h2>
              <p>Dispersión espacial de PM2,5 en la cuenca urbana del Distrito Capital.</p></div>
            <MapLegend />
          </div>
          <div className="map-content">
            <div className="map-column">
              <LocalityMap stations={stations} selected={station} select={changeStation} />
              <p className="map-source">Límites de localidades · <a href="https://mapas.gobiernobogota.gov.co/waserver/rest/services/Mapa_Base/MapServer/4" target="_blank" rel="noreferrer">IDECA</a></p>
            </div>
            <StationDetail station={selected} data={stationData} onPin={pinStation} pinned={pinnedStation === station} />
          </div>
        </section>
      </section>
    </main>
    <SiteFooter />
  </>
}
