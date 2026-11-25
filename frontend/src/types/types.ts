// Tipos compartidos entre pantallas y la capa de API.
export type User = { id: number; nombre: string; usuario: string; foto: string | null; google_vinculado: boolean; puede_moderar: boolean; puede_moderar_cuentas: boolean; es_admin: boolean }
export type Session = { usuario: User | null; csrf: string; google_disponible: boolean }
export type Station = { slug: string; nombre: string; localidad: string; localidad_nombre?: string; latitud: number; longitud: number; desde: string | null; hasta: string | null }
export type Reading = { hora: string; pm25: number; unidad: string }
export type Result = { estado: string; emision: string; medicion: (Reading & { antiguedad_minutos: number }) | null;
  pronostico: Reading | null; evaluacion?: { hora_observada: string; pm25_observado: number | null } }
