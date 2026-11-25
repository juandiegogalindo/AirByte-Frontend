// Cliente HTTP del backend (/api/v1). Convierte cualquier fallo en un ApiError con mensaje legible.
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const SIN_CONEXION = 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
const SERVIDOR_NO_RESPONDE = 'El servidor está despertando o no responde. Espera unos segundos e inténtalo de nuevo.'
const CONSULTA_NO_DISPONIBLE = 'La consulta no está disponible.'

async function leerJson(response: Response): Promise<unknown> {
  try { return await response.json() } catch { return null }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch('/api/v1' + path, options)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(SIN_CONEXION, 0)
  }
  if (response.status === 204) return undefined as T
  const data = await leerJson(response)
  const mensaje = (data as { mensaje?: unknown } | null)?.mensaje
  if (!response.ok) {
    const porDefecto = response.status >= 500 ? SERVIDOR_NO_RESPONDE : CONSULTA_NO_DISPONIBLE
    throw new ApiError(typeof mensaje === 'string' ? mensaje : porDefecto, response.status)
  }
  if (data === null) throw new ApiError(SERVIDOR_NO_RESPONDE, response.status)
  return data as T
}

export function write<T>(path: string, method: string, csrf: string, data?: object) {
  return api<T>(path, { method, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: data ? JSON.stringify(data) : undefined })
}
