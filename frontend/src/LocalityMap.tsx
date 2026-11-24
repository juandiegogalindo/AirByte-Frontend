import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { api, hora, numero } from './api'
import shapes from './localidades.json'

type Station = { slug: string; nombre: string; localidad: string }
type Reading = { hora: string; pm25: number; antiguedad_minutos: number }
const bands = [
  { label: 'Menos de 20', color: '#279a76' },
  { label: '20 a menos de 40', color: '#e89136' },
  { label: '40 o más', color: '#bc4b57' },
  { label: 'Sin lectura reciente', color: '#869599' },
]
const areas = shapes as FeatureCollection<Polygon | MultiPolygon, { nombre: string }>
const slug = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replaceAll(' ', '-')

export default function LocalityMap({ stations, selected, select }: {
  stations: Station[]; selected: string; select: (id: string) => void
}) {
  const element = useRef<HTMLDivElement>(null)
  const layer = useRef<L.GeoJSON | null>(null)
  const [readings, setReadings] = useState<Record<string, Reading | null>>({})
  useEffect(() => {
    if (!stations.length) return
    let active = true
    async function refresh() {
      const results = await Promise.all(stations.map(async station => {
        try {
          const data = await api<{ medicion: Reading | null }>('/actual?' + new URLSearchParams({ estacion: station.slug }))
          return [station.slug, data.medicion] as const
        } catch { return [station.slug, null] as const }
      }))
      if (active) setReadings(Object.fromEntries(results))
    }
    void refresh()
    const timer = window.setInterval(refresh, 5 * 60 * 1000)
    return () => { active = false; window.clearInterval(timer) }
  }, [stations])
  useEffect(() => {
    const map = L.map(element.current!, { scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · IDECA',
    }).addTo(map)
    const boundaries = L.geoJSON(areas).addTo(map)
    layer.current = boundaries
    map.fitBounds(boundaries.getBounds(), { padding: [15, 15] })
    return () => { layer.current = null; map.remove() }
  }, [])
  useEffect(() => {
    const boundaries = layer.current
    if (!boundaries) return
    boundaries.clearLayers()
    boundaries.options.onEachFeature = (feature, polygon) => {
      const name = feature.properties.nombre
      const candidates = stations.filter(s => s.localidad === slug(name))
      const recent = candidates.map(station => ({ station, reading: readings[station.slug] }))
        .filter(item => item.reading && item.reading.antiguedad_minutos < 180)
        .sort((a, b) => b.reading!.pm25 - a.reading!.pm25)[0]
      const value = recent?.reading?.pm25
      const fill = bands[value === undefined ? 3 : value < 20 ? 0 : value < 40 ? 1 : 2].color
      const chosen = candidates.some(station => station.slug === selected)
      ;(polygon as L.Path).setStyle({ color: chosen ? '#173943' : '#ffffff', weight: chosen ? 3 : 2,
        fillColor: fill, fillOpacity: .65 })
      const info = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = name
      info.append(heading)
      const description = document.createElement('div')
      description.textContent = recent?.reading
        ? numero.format(recent.reading.pm25) + ' µg/m³ · ' + recent.station.nombre + ' · ' + hora(recent.reading.hora)
        : 'Sin lectura reciente'
      info.append(description)
      polygon.bindTooltip(info)
      const target = recent?.station ?? candidates[0]
      if (target) polygon.on('click', () => select(target.slug))
    }
    boundaries.addData(areas)
  }, [stations, readings, selected, select])
  return <>
    <div ref={element} className="map" aria-label="Mapa de PM2,5 por localidad piloto" />
    <small className="map-note">PM2,5 horario en µg/m³. El color usa la lectura reciente más alta entre las estaciones de cada localidad.</small>
  </>
}

export function MapLegend() {
  return <ul className="map-legend" aria-label="Escala visual de PM2,5 en microgramos por metro cúbico">
    {bands.map(band => <li key={band.label}><span style={{ background: band.color }} />{band.label}</li>)}
  </ul>
}
