// Formato de fechas y números en es-CO.
export function hora(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short',
    timeZone: 'America/Bogota' }).format(new Date(value))
}
export const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
