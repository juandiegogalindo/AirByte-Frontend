// Rangos visuales propios de Air-Byte para PM2,5 (µg/m³). No son categorías IBOCA.
export type Nivel = 'baja' | 'intermedia' | 'alta' | 'sin-dato'

export const LIMITE_BAJO = 20
export const LIMITE_ALTO = 40
export const ESCALA_MAXIMA = 60

export function nivelPm25(valor?: number): Nivel {
  if (valor === undefined) return 'sin-dato'
  return valor < LIMITE_BAJO ? 'baja' : valor < LIMITE_ALTO ? 'intermedia' : 'alta'
}

export function posicionEnEscala(valor: number) {
  return (Math.min(Math.max(valor, 0), ESCALA_MAXIMA) / ESCALA_MAXIMA) * 100
}
