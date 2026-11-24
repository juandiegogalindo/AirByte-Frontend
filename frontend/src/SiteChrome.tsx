import { useEffect, useState } from 'react'
import { api, guardarDestinoAutenticacion, notificarSesionActualizada, write } from './api'
import type { Session } from './api'

type Theme = 'dark' | 'light'
const COPYRIGHT_YEAR = new Date().getFullYear()

export function SiteHeader() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = document.body.dataset.theme || localStorage.getItem('airbyte-theme')
    return saved === 'light' ? 'light' : 'dark'
  })
  const [session, setSession] = useState<Session>()
  const [loggingOut, setLoggingOut] = useState(false)
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    document.body.dataset.theme = theme
    try { localStorage.setItem('airbyte-theme', theme) } catch { /* El modo sigue activo en esta página. */ }
  }, [theme])

  useEffect(() => {
    api<Session>('/sesion').then(setSession).catch(() => undefined)
  }, [])

  useEffect(() => {
    function receiveSession(event: Event) {
      setSession((event as CustomEvent<Session>).detail)
    }
    window.addEventListener('airbyte:session-update', receiveSession)
    return () => window.removeEventListener('airbyte:session-update', receiveSession)
  }, [])

  async function signOut() {
    if (!session) return
    setLoggingOut(true)
    try {
      await write('/sesion', 'DELETE', session.csrf)
      const updatedSession = await api<Session>('/sesion')
      setSession(updatedSession)
      notificarSesionActualizada(updatedSession)
      if (!updatedSession.usuario && ['/administracion', '/moderacion', '/perfil'].includes(path)) {
        guardarDestinoAutenticacion(path)
        window.location.replace('/login')
      }
    } catch {
      const current = await api<Session>('/sesion').catch(() => undefined)
      if (current) {
        setSession(current)
        notificarSesionActualizada(current)
        if (!current.usuario && ['/administracion', '/moderacion', '/perfil'].includes(path)) {
          guardarDestinoAutenticacion(path)
          window.location.replace('/login')
        }
      }
    } finally {
      setLoggingOut(false)
    }
  }

  return <header className="site-header">
    <a href="/" className="brand" aria-label="Airbyte, página principal">
      <AirbyteLogoImages className="brand-logo" alt="" />
    </a>
    <nav aria-label="Navegación principal">
      <a className={path === '/' ? 'is-active' : ''} href="/#consulta">Calidad del aire</a>
      <a className={path === '/comunidad' ? 'is-active' : ''} href="/comunidad">Comunidad</a>
      {session?.usuario?.puede_moderar_cuentas && <a className={path === '/moderacion' ? 'is-active' : ''} href="/moderacion">Moderación</a>}
      {session?.usuario?.es_admin && <a className={path === '/administracion' ? 'is-active' : ''} href="/administracion">Administración</a>}
    </nav>
    <div className="header-actions">
      <button className="theme-toggle" type="button" onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}<span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>
      {session?.usuario ? <div className="header-user">
        <a className="profile-link" href="/perfil" aria-label="Abrir configuración de perfil" title="Configuración del perfil">
          {session.usuario.foto
            ? <img className="user-avatar" src={session.usuario.foto} alt="" />
            : <span className="user-avatar" aria-hidden="true">{session.usuario.nombre.slice(0, 1).toUpperCase()}</span>}
          <span className="user-name">{session.usuario.nombre}<small>Mi perfil</small></span>
        </a>
        <button className="logout-button" type="button" onClick={() => void signOut()} disabled={loggingOut}>
          {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div> : <div className="account-links">
        <a href="/login">Iniciar sesión</a><a className="button-link" href="/registro">Crear cuenta</a>
      </div>}
    </div>
  </header>
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-summary">
      <a href="/" className="brand"><AirbyteLogoImages className="brand-logo" alt="Airbyte" /></a>
      <p>Información horaria y estimaciones de PM2,5 para Bogotá.</p>
      <small>© {COPYRIGHT_YEAR} Air-Byte · Datos abiertos RMCAB — Secretaría Distrital de Ambiente.</small>
    </div>
    <nav className="footer-links" aria-label="Fuentes y condiciones">
      <a href="/terminos">Términos y condiciones</a><span aria-hidden="true">•</span>
      <a href="https://rmcab.ambientebogota.gov.co/" target="_blank" rel="noreferrer">Red RMCAB</a>
    </nav>
  </footer>
}

export function AirbyteLogoImages({ className, alt }: { className: string; alt: string }) {
  return <>
    <img className={`${className} brand-logo-light`} src="/airbyte-logo.png" alt={alt} />
    <img className={`${className} brand-logo-dark`} src="/airbyte-logo-dark.png" alt={alt} />
  </>
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-icon">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
  </svg>
}

function MoonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-icon">
    <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" />
  </svg>
}
