export type User = { id: number; nombre: string; usuario: string; foto: string | null; google_vinculado: boolean; puede_moderar: boolean; puede_moderar_cuentas: boolean; es_admin: boolean }
export type Session = { usuario: User | null; csrf: string; google_disponible: boolean }
const AUTH_DESTINATION_KEY = 'airbyte-auth-destination'
const AUTH_DESTINATION_TTL = 30 * 60 * 1000

function destinoInterno(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    const ruta = url.pathname.replace(/\/+$/, '') || '/'
    if (url.origin !== window.location.origin || !['/administracion', '/moderacion', '/perfil', '/comunidad'].includes(ruta)) return null
    return `${ruta}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function guardarDestinoAutenticacion(value: string) {
  const destino = destinoInterno(value)
  if (!destino) return
  try {
    sessionStorage.setItem(AUTH_DESTINATION_KEY, JSON.stringify({ destino, creado: Date.now() }))
  } catch { /* El inicio de sesión usa la página predeterminada si el almacenamiento está bloqueado. */ }
}

export function leerDestinoAutenticacion(fallback = '/comunidad') {
  try {
    const almacenado = sessionStorage.getItem(AUTH_DESTINATION_KEY)
    if (almacenado) {
      const dato = JSON.parse(almacenado) as { destino?: string; creado?: number }
      if (typeof dato.creado === 'number' && Date.now() - dato.creado < AUTH_DESTINATION_TTL) {
        const destino = destinoInterno(dato.destino)
        if (destino) return destino
      }
      sessionStorage.removeItem(AUTH_DESTINATION_KEY)
    }
    const legado = destinoInterno(new URLSearchParams(window.location.search).get('next'))
    if (legado) {
      guardarDestinoAutenticacion(legado)
      return legado
    }
  } catch { /* El inicio de sesión sigue disponible sin almacenamiento local. */ }
  return fallback
}

export function consumirDestinoAutenticacion(fallback = '/comunidad') {
  const destino = leerDestinoAutenticacion(fallback)
  try { sessionStorage.removeItem(AUTH_DESTINATION_KEY) } catch { /* No hay nada que limpiar. */ }
  return destino
}

export function limpiarParametroNext() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('next')) return
  url.searchParams.delete('next')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch('/api/v1' + path, options)
  if (response.status === 204) return undefined as T
  const data = await response.json()
  if (!response.ok) throw new Error(data.mensaje ?? 'La consulta no está disponible.')
  return data
}
export function write<T>(path: string, method: string, csrf: string, data?: object) {
  return api<T>(path, { method, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: data ? JSON.stringify(data) : undefined })
}
export function notificarSesionActualizada(session: Session) {
  window.dispatchEvent(new CustomEvent('airbyte:session-update', { detail: session }))
}
export function hora(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short',
    timeZone: 'America/Bogota' }).format(new Date(value))
}
export const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

