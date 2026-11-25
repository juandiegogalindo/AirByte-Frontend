import './Current.css'
import { hora, numero } from './format'
import type { ForecastPoint } from './HourlyChart'
import { LIMITE_ALTO, LIMITE_BAJO } from './nivel'

const W = 480
const H = 60
const MARGEN = 5

// Resumen del pronóstico de 24 h dentro de la tarjeta principal. El detalle está en HourlyChart.
export default function Sparkline({ reading, forecast }: { reading: ForecastPoint; forecast: ForecastPoint[] }) {
  const points = [reading, ...forecast]
  const techo = Math.max(25, Math.ceil(Math.max(...points.map(p => p.pm25)) / 5) * 5)
  const x = (i: number) => MARGEN + (i / (points.length - 1)) * (W - 2 * MARGEN)
  const y = (valor: number) => H - MARGEN - (valor / techo) * (H - 2 * MARGEN)
  const linea = points.map((p, i) => `${x(i).toFixed(1)},${y(p.pm25).toFixed(1)}`).join(' ')
  const pico = forecast.reduce((mayor, p) => p.pm25 > mayor.pm25 ? p : mayor)
  const minimo = forecast.reduce((menor, p) => p.pm25 < menor.pm25 ? p : menor)
  const resumen = `Pronóstico de las próximas 24 horas: mínimo ${numero.format(minimo.pm25)} µg/m³ a las ${hora(minimo.hora)} y máximo ${numero.format(pico.pm25)} µg/m³ a las ${hora(pico.hora)}.`
  return <figure className="sparkline">
    <figcaption><span>PRÓXIMAS 24 H</span><span>mín. {numero.format(minimo.pm25)} · máx. {numero.format(pico.pm25)} µg/m³</span></figcaption>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={resumen}>
      <polygon className="spark-area" points={`${x(0)},${H} ${linea} ${x(points.length - 1)},${H}`} />
      {[LIMITE_BAJO, LIMITE_ALTO].filter(limite => limite < techo).map(limite =>
        <line key={limite} className="spark-limit" x1="0" x2={W} y1={y(limite)} y2={y(limite)} />)}
      <polyline className="spark-line" points={linea} />
      <circle className="spark-now" cx={x(0)} cy={y(reading.pm25)} r="3.5" />
      <circle className="spark-peak" cx={x(points.indexOf(pico))} cy={y(pico.pm25)} r="3.5" />
    </svg>
    <div className="spark-axis" aria-hidden="true"><span>Última lectura</span><span>+24 h</span></div>
  </figure>
}
