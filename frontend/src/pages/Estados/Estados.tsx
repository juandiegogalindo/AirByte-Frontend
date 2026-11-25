import './Estados.css'

// Bloque gris animado que ocupa el lugar del contenido mientras carga.
export function Skeleton({ width, height }: { width?: string; height?: string }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height }} />
}

// Mensaje de error con botón para volver a intentar.
export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-notice" role="alert">
    <p>{message}</p>
    {onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}
  </div>
}
