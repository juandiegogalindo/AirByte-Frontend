import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { hora, numero } from './api'

export type ForecastPoint = { hora: string; pm25: number }
const time = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit',
  hourCycle: 'h23', timeZone: 'America/Bogota' })
const plot = { left: 48, right: 612, top: 18, bottom: 166 }

export default function HourlyChart({ reading, forecast }: { reading: ForecastPoint; forecast: ForecastPoint[] }) {
  const [active, setActive] = useState<number | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const touchActive = useRef(false)
  const points = [reading, ...forecast]
  const scale = Math.max(5, Math.ceil(Math.max(...points.map(p => p.pm25)) / 5) * 5)
  const x = (i: number) => plot.left + (i / forecast.length) * (plot.right - plot.left)
  const y = (value: number) => plot.bottom - (value / scale) * (plot.bottom - plot.top)
  const forecastLine = forecast.map((point, index) => `${x(index + 1)},${y(point.pm25)}`).join(' ')
  const selected = active === null ? null : points[Math.min(active, points.length - 1)]

  function chooseByPointer(event: ReactPointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width) return
    const chartX = (event.clientX - bounds.left) / bounds.width * 630
    const index = Math.round((chartX - plot.left) / (plot.right - plot.left) * forecast.length)
    setActive(Math.max(0, Math.min(points.length - 1, index)))
    setTooltipVisible(true)
  }

  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch') touchActive.current = true
    chooseByPointer(event)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch' && !touchActive.current) return
    chooseByPointer(event)
  }

  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch') touchActive.current = false
  }

  const tooltipLeft = active === null ? 50 : x(active) / 630 * 100
  const tooltipTop = active === null ? 50 : Math.max(26, y(points[active].pm25) / 200 * 100)

  return <figure className="pm-chart">
    <div className="pm-chart-plot">
      <svg ref={svgRef} viewBox="0 0 630 200" role="group"
        aria-label="Pronóstico horario de PM2,5. Pasa el cursor, toca o arrastra sobre la gráfica para consultar cada hora."
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onPointerLeave={event => { if (event.pointerType === 'mouse') setTooltipVisible(false) }}>
        {[0, .25, .5, .75, 1].map(f => <g key={f} aria-hidden="true">
          <line x1={plot.left} x2={plot.right} y1={y(scale * f)} y2={y(scale * f)} className="chart-gridline" />
          <text x={plot.left - 8} y={y(scale * f) + 4} textAnchor="end">{numero.format(scale * f)}</text>
        </g>)}
        <polygon points={`${x(1)},${plot.bottom} ${forecastLine} ${x(forecast.length)},${plot.bottom}`} className="chart-area" />
        <line x1={x(0)} y1={y(reading.pm25)} x2={x(1)} y2={y(forecast[0].pm25)} className="chart-reading-link" />
        <polyline points={forecastLine} className="chart-line" />
        {active !== null && <line x1={x(active)} x2={x(active)} y1={plot.top} y2={plot.bottom} className="chart-guide" />}
        {points.map((point, index) => <g key={point.hora} tabIndex={0} role="button"
          aria-label={`${index === 0 ? 'Medición oficial' : 'Pronóstico'} ${time.format(new Date(point.hora))}: ${numero.format(point.pm25)} microgramos por metro cúbico`}
          onFocus={() => { setActive(index); setTooltipVisible(true) }}
          onBlur={() => setTooltipVisible(false)}
          onKeyDown={event => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault()
              const next = Math.max(0, Math.min(points.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))
              setActive(next)
              setTooltipVisible(true)
              svgRef.current?.querySelector<SVGGElement>(`[data-point="${next}"]`)?.focus()
            }
          }} data-point={index}>
          <circle cx={x(index)} cy={y(point.pm25)} r={active === index ? 5 : 2.8}
            className={index === 0 ? 'chart-reading-dot' : 'chart-dot'} />
          {index % 6 === 0 && <text x={x(index)} y="189" textAnchor={index === forecast.length ? 'end' : 'middle'} aria-hidden="true">
            {time.format(new Date(point.hora))}</text>}
        </g>)}
      </svg>
      {tooltipVisible && selected && <div className={`chart-tooltip${active === 0 ? ' is-left' : active === forecast.length ? ' is-right' : ''}`}
        style={{ left: `${tooltipLeft}%`, top: `${tooltipTop}%` }} role="status">
        <span>{active === 0 ? 'Última medición · RMCAB' : `Pronóstico · ${time.format(new Date(selected.hora))}`}</span>
        <strong>{numero.format(selected.pm25)} <small>µg/m³</small></strong>
        <time dateTime={selected.hora}>{hora(selected.hora)} · Bogotá</time>
      </div>}
    </div>
    <figcaption className="sr-only" aria-live="polite">{selected && `${active === 0 ? 'Medición' : 'Pronóstico'} de ${numero.format(selected.pm25)} microgramos por metro cúbico a las ${hora(selected.hora)}.`}</figcaption>
  </figure>
}
