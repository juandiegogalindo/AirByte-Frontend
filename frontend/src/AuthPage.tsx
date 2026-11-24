import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, consumirDestinoAutenticacion, leerDestinoAutenticacion, limpiarParametroNext, write } from './api'
import type { Session } from './api'
import { AirbyteLogoImages, SiteFooter, SiteHeader } from './SiteChrome'
import './Auth.css'

export default function AuthPage({ mode }: { mode: 'login' | 'registro' }) {
  const registering = mode === 'registro'
  const [session, setSession] = useState<Session>()
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [returnPath] = useState(() => leerDestinoAutenticacion())

  useEffect(() => {
    limpiarParametroNext()
    api<Session>('/sesion').then(current => {
      setSession(current)
      if (current.usuario) {
        const destination = consumirDestinoAutenticacion(returnPath)
        window.location.replace(current.usuario.es_admin ? '/administracion' : destination)
      }
    }).catch(() => setError('No pudimos conectar con Air-Byte.'))
  }, [returnPath])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || (registering && !accepted)) return
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const data = Object.fromEntries(form.entries())
    try {
      if (registering) await write('/registro', 'POST', session.csrf, { ...data, acepto_terminos: accepted })
      const result = await write<Session>('/sesion', 'POST', session.csrf, {
        usuario: data.usuario,
        contrasena: data.contrasena,
      })
      setSession(result)
      const destination = consumirDestinoAutenticacion(returnPath)
      window.location.assign(result.usuario?.es_admin ? '/administracion' : destination)
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    if (!session?.google_disponible) return
    setBusy(true)
    setError('')
    try {
      const result = await write<{ url: string }>('/auth/google/iniciar', 'POST', session.csrf, { accion: 'entrar' })
      window.location.assign(result.url)
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return <div className="auth-page">
    <SiteHeader />
    <div className="auth-status"><span className="live-dot" /> RED DE MONITOREO · BOGOTÁ D.C.</div>
    <main className="auth-main">
      <div className="auth-card">
        <a className="auth-brand" href="/" aria-label="Airbyte"><AirbyteLogoImages className="auth-brand-logo" alt="" /></a>
        <h1>{registering ? 'Crea tu cuenta' : 'Bienvenido a Air-Byte'}</h1>
        <p className="auth-intro">{registering
          ? 'Únete a la comunidad y comparte lo que observas en tu localidad.'
          : 'Consulta el aire de Bogotá y participa en los reportes de tu localidad.'}</p>

        <button className="google-button" type="button" disabled={!session?.google_disponible || busy} onClick={() => void google()}>
          <GoogleMark />Continuar con Google
        </button>
        {session && !session.google_disponible && <p className="google-unavailable" role="status">El acceso con Google no está habilitado en este momento.</p>}
        <div className="auth-divider"><span />{registering ? 'O REGÍSTRATE CON TUS DATOS' : 'O CONTINÚA CON TU CUENTA'}<span /></div>

        <form className="auth-form" onSubmit={event => void submit(event)}>
          {registering && <label>Nombre de usuario<input name="usuario" autoComplete="username" required maxLength={150} minLength={3} /></label>}
          {registering && <label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
          {!registering && <label>Correo electrónico o usuario<input name="usuario" autoComplete="username" required maxLength={254} /></label>}
          <label>Contraseña<span className="password-wrap"><input name="contrasena" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required maxLength={1024} /><button type="button" className="reveal-password" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></span></label>
          {registering && <p className="password-help">Usa una contraseña que no compartas con otros sitios.</p>}
          {registering && <div className="legal-consent"><span className="consent-icon">⌁</span><div><strong>Tu cuenta, bajo tu control</strong>
            <p>Tratamos los datos de tu cuenta para gestionar el acceso y asociar tus publicaciones, en el marco de la Ley 1581 de 2012 (Habeas Data). Consulta los <a href="/terminos">términos y condiciones</a> y <a href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noreferrer">el texto de la ley</a>.</p>
            <label className="consent-check"><input id="auth-legal-consent" type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required /><span>Acepto los términos y el aviso sobre el tratamiento de mis datos.</span></label>
          </div></div>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={!session || (registering && !accepted) || busy}>{busy ? 'Un momento…' : registering ? 'Crear cuenta' : 'Iniciar sesión'} <span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">{registering ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'} <a href={registering ? '/login' : '/registro'}>{registering ? 'Inicia sesión' : 'Regístrate gratis'}</a></p>
      </div>
    </main>
    <SiteFooter />
  </div>
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="google-mark"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.1 5.1 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09a6.96 6.96 0 0 1 0-4.18V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.85Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
}
