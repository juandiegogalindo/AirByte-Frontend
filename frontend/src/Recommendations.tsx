import { hora, numero } from './api'
import type { CurrentData } from './Current'

type Advice = { icon: string; iconClass: string; title: string; text: string }

export default function Recommendations({ data }: { data?: CurrentData }) {
  const reading = data?.medicion && data.medicion.antiguedad_minutos < 180
    ? data.medicion
    : undefined
  const forecast = data?.estado === 'ok' ? data.horas : []
  const minimum = forecast.length
    ? forecast.reduce((best, point) => point.pm25 < best.pm25 ? point : best)
    : undefined
  const maximum = forecast.length
    ? forecast.reduce((best, point) => point.pm25 > best.pm25 ? point : best)
    : undefined
  const band = reading
    ? reading.pm25 < 20 ? 'baja' : reading.pm25 < 40 ? 'intermedia' : 'alta'
    : 'sin-dato'

  let advice: Advice[]
  if (band === 'baja') {
    advice = [
      { icon: '↗', iconClass: 'activity-icon', title: 'Planea tus actividades',
        text: `La lectura reciente es ${numero.format(reading!.pm25)} µg/m³. Puedes mantener tu rutina habitual y revisar el pronóstico si vas a estar varias horas al aire libre.` },
      { icon: '⌂', iconClass: 'home-icon', title: 'Ten en cuenta cómo te sientes',
        text: 'Si tienes asma u otra condición respiratoria o cardiovascular, sigue las indicaciones de tu profesional de salud y presta atención a cualquier síntoma.' },
      { icon: '◎', iconClass: 'official-icon', title: minimum ? 'Mejor hora estimada' : 'Consulta el pronóstico',
        text: minimum
          ? `El menor valor estimado para las próximas 24 horas es ${numero.format(minimum.pm25)} µg/m³, a las ${hora(minimum.hora)}. Es una estimación y puede cambiar.`
          : 'El pronóstico horario no está disponible ahora. Consulta IBOCA antes de planear actividades prolongadas al aire libre.' },
    ]
  } else if (band === 'intermedia') {
    advice = [
      { icon: '↗', iconClass: 'activity-icon', title: 'Ajusta el esfuerzo al aire libre',
        text: `La lectura reciente es ${numero.format(reading!.pm25)} µg/m³, en el rango intermedio del mapa. Si eres sensible a la contaminación, considera bajar la intensidad o elegir una hora con menor PM2,5 previsto.` },
      { icon: '⌂', iconClass: 'home-icon', title: 'Reduce la exposición cercana',
        text: 'Niños, personas mayores y quienes tienen condiciones respiratorias o cardiovasculares pueden limitar el tiempo junto a vías congestionadas, humo y otras fuentes de partículas.' },
      { icon: '◎', iconClass: 'official-icon', title: minimum ? 'Busca una hora más favorable' : 'Revisa IBOCA',
        text: minimum
          ? `El menor valor estimado para las próximas 24 horas es ${numero.format(minimum.pm25)} µg/m³, a las ${hora(minimum.hora)}${maximum ? `; el máximo previsto es ${numero.format(maximum.pm25)} µg/m³` : ''}.`
          : 'No hay pronóstico horario disponible. Consulta las recomendaciones oficiales de IBOCA para Bogotá.' },
    ]
  } else if (band === 'alta') {
    advice = [
      { icon: '↗', iconClass: 'activity-icon', title: 'Reduce el ejercicio intenso afuera',
        text: `La lectura reciente es ${numero.format(reading!.pm25)} µg/m³, en el rango alto del mapa. Considera posponer el ejercicio vigoroso y prolongado al aire libre, especialmente si eres parte de un grupo sensible.` },
      { icon: '⌂', iconClass: 'home-icon', title: 'Aléjate de fuentes de humo',
        text: 'Prioriza espacios interiores cuando sea posible y reduce el tiempo junto a tráfico, quemas o polvo. Sigue tu plan de cuidado y las indicaciones oficiales si presentas síntomas.' },
      { icon: '◎', iconClass: 'official-icon', title: minimum ? 'Consulta cuándo podría bajar' : 'Consulta las alertas oficiales',
        text: minimum
          ? `El menor valor estimado para las próximas 24 horas es ${numero.format(minimum.pm25)} µg/m³, a las ${hora(minimum.hora)}. Verifica IBOCA antes de salir; el modelo puede no anticipar todos los picos.`
          : 'El pronóstico horario no está disponible ahora. Consulta IBOCA para conocer el estado oficial y sus recomendaciones vigentes.' },
    ]
  } else {
    advice = [
      { icon: '↗', iconClass: 'activity-icon', title: 'Falta una lectura reciente',
        text: 'No podemos ajustar los consejos a la condición actual de esta estación. Consulta el mapa oficial IBOCA antes de planear actividad al aire libre.' },
      { icon: '⌂', iconClass: 'home-icon', title: 'Considera el pronóstico',
        text: minimum
          ? `El menor valor estimado en las próximas 24 horas es ${numero.format(minimum.pm25)} µg/m³, a las ${hora(minimum.hora)}. La estimación no sustituye una medición actual.`
          : 'Cuando vuelva a estar disponible la lectura reciente, los consejos se actualizarán automáticamente.' },
      { icon: '◎', iconClass: 'official-icon', title: 'Sigue la información de Bogotá',
        text: 'IBOCA comunica el nivel oficial de riesgo y las recomendaciones vigentes para la ciudad.' },
    ]
  }

  const label = band === 'baja' ? 'MENOR CONTAMINACIÓN' : band === 'intermedia' ? 'CONTAMINACIÓN MODERADA'
    : band === 'alta' ? 'CONTAMINACIÓN ALTA' : 'SIN LECTURA'

  return <section className="panel recommendations" aria-labelledby="recommendations-title">
    <div className="recommendations-heading"><span className="recommendations-symbol" aria-hidden="true">✳</span>
      <div><h2 id="recommendations-title">Recomendaciones para ti</h2>
        <p>{reading ? `Según la lectura reciente · ${numero.format(reading.pm25)} µg/m³` : 'Consejos según la estación seleccionada'}</p></div>
      <span className={`recommendations-tag is-${band}`}>{label}</span>
    </div>
    <div className="recommendation-list" aria-live="polite">
      {advice.map(item => <article className="recommendation" key={item.title}>
        <span className={`recommendation-icon ${item.iconClass}`} aria-hidden="true">{item.icon}</span>
        <div><h3>{item.title}</h3><p>{item.text}</p></div>
      </article>)}
    </div>
    <p className="recommendations-disclaimer">Rangos visuales propios de Air-Byte; no son categorías IBOCA. La lectura horaria por estación es orientativa.</p>
    <a className="recommendations-source" href="https://iboca.ambientebogota.gov.co/mapa/" target="_blank" rel="noreferrer">
      Consulta el IBOCA oficial · Secretaría Distrital de Ambiente <span aria-hidden="true">↗</span>
    </a>
  </section>
}
