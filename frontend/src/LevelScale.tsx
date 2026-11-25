import './Current.css'
import { Skeleton } from './Estados'
import { numero } from './format'
import { ESCALA_MAXIMA, LIMITE_ALTO, LIMITE_BAJO, nivelPm25, posicionEnEscala } from './nivel'

const ETIQUETA = {
  baja: 'NIVEL BAJO',
  intermedia: 'NIVEL INTERMEDIO',
  alta: 'NIVEL ALTO',
  'sin-dato': 'SIN LECTURA RECIENTE',
}

export default function LevelScale({ value, caption, loading = false }: { value?: number; caption: string; loading?: boolean }) {
  if (loading) return <div className="level-scale" aria-hidden="true">
    <div className="level-head"><Skeleton width="8rem" height="1.5rem" /><Skeleton width="11rem" height="1rem" /></div>
    <Skeleton width="100%" height=".6rem" />
    <Skeleton width="100%" height=".8rem" />
  </div>
  const nivel = nivelPm25(value)
  const medidor = value === undefined ? { 'aria-hidden': true } : {
    role: 'meter',
    'aria-label': 'Nivel de PM2,5 en la escala visual de Air-Byte (no es IBOCA)',
    'aria-valuemin': 0,
    'aria-valuemax': ESCALA_MAXIMA,
    'aria-valuenow': Math.min(value, ESCALA_MAXIMA),
    'aria-valuetext': `${numero.format(value)} µg/m³, ${ETIQUETA[nivel].toLowerCase()}`,
  }
  return <div className="level-scale">
    <div className="level-head">
      <span className={`level-badge is-${nivel}`}>{ETIQUETA[nivel]}</span>
      <span className="reading-caption">{caption}</span>
    </div>
    <div className="level-track" {...medidor}>
      <span className="is-baja" /><span className="is-intermedia" /><span className="is-alta" />
      {value !== undefined && <i className="level-marker" style={{ left: `${posicionEnEscala(value)}%` }} />}
    </div>
    <div className="level-labels" aria-hidden="true">
      <span>Bajo · &lt; {LIMITE_BAJO}</span><span>Intermedio · {LIMITE_BAJO}–{LIMITE_ALTO}</span><span>Alto · ≥ {LIMITE_ALTO}</span>
    </div>
  </div>
}
