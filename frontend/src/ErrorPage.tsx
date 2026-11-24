import { SiteFooter, SiteHeader } from './SiteChrome'
import './ErrorPage.css'

const DETAILS: Record<number, { title: string; description: string }> = {
  400: { title: 'Solicitud no válida', description: 'Revisa la información e inténtalo de nuevo.' },
  401: { title: 'Inicia sesión para continuar', description: 'Necesitas una sesión activa para ver este contenido.' },
  403: { title: 'No tienes permiso para entrar aquí', description: 'Tu cuenta no tiene acceso a esta página. Si crees que es un error, contacta al equipo de Air-Byte.' },
  404: { title: 'No encontramos esta página', description: 'Puede que el enlace haya cambiado o que la dirección esté escrita de forma incorrecta.' },
  405: { title: 'Acción no disponible', description: 'No se puede completar esa acción desde esta página.' },
  429: { title: 'Vamos un poco rápido', description: 'Espera un momento antes de volver a intentarlo.' },
  500: { title: 'Algo salió mal', description: 'Tuvimos un problema al cargar esta página. Inténtalo de nuevo en unos momentos.' },
  502: { title: 'Servicio temporalmente no disponible', description: 'No pudimos comunicarnos con el servicio. Vuelve a intentarlo pronto.' },
  503: { title: 'Estamos trabajando para volver', description: 'El servicio está temporalmente fuera de línea. Inténtalo de nuevo más tarde.' },
}

export default function ErrorPage({ status = 404 }: { status?: number }) {
  const error = DETAILS[status] ?? DETAILS[500]
  return <>
    <SiteHeader />
    <main className="error-main">
      <section className="panel error-panel" aria-labelledby="error-title">
        <span className="error-symbol" aria-hidden="true">≈</span>
        <p className="error-code">{status}</p>
        <h1 id="error-title">{error.title}</h1>
        <p className="error-description">{error.description}</p>
        <div className="error-actions">
          <a className="button-link" href="/">Volver a calidad del aire</a>
          <a className="error-secondary" href="/comunidad">Ir a comunidad</a>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>
}
