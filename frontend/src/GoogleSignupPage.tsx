import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, consumirDestinoAutenticacion, leerDestinoAutenticacion, limpiarParametroNext } from './api'
import type { Session } from './api'
import { AirbyteLogoImages, SiteFooter, SiteHeader } from './SiteChrome'
import './Auth.css'
import './Profile.css'

type PendingGoogle = { nombre: string; correo: string }

export default function GoogleSignupPage() {
  const [session, setSession] = useState<Session>()
  const [pending, setPending] = useState<PendingGoogle>()
  const [name, setName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [returnPath] = useState(() => leerDestinoAutenticacion())

  useEffect(() => {
    limpiarParametroNext()
    let active = true
    Promise.all([api<Session>('/sesion'), api<PendingGoogle>('/auth/google/pendiente')])
      .then(([currentSession, googleAccount]) => {
        if (!active) return
        setSession(currentSession)
        setPending(googleAccount)
        setName(googleAccount.nombre)
      })
      .catch(cause => { if (active) setError((cause as Error).message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const image = URL.createObjectURL(photo)
    setPreview(image)
    return () => URL.revokeObjectURL(image)
  }, [photo])

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !accepted) return
    setBusy(true)
    setError('')
    const data = new FormData()
    data.set('nombre', name.trim())
    data.set('acepto_terminos', 'true')
    if (photo) data.set('foto', photo)
    try {
      const createdSession = await api<Session>('/auth/google/crear', {
        method: 'POST',
        headers: { 'X-CSRFToken': session.csrf },
        body: data,
      })
      const destination = consumirDestinoAutenticacion(returnPath)
      window.location.assign(createdSession.usuario?.es_admin ? '/administracion' : destination)
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return <div className="auth-page">
    <SiteHeader />
    <div className="auth-status"><span className="live-dot" /> CREACIÓN DE CUENTA · GOOGLE</div>
    <main className="auth-main">
      <div className="auth-card">
        <a className="auth-brand" href="/" aria-label="Airbyte"><AirbyteLogoImages className="auth-brand-logo" alt="" /></a>
        <h1>Completa tu perfil</h1>
        <p className="auth-intro">Ya verificamos tu cuenta de Google. Personaliza cómo aparecerás en la comunidad y acepta los términos para crear tu cuenta.</p>

        {loading ? <p className="profile-loading" role="status">Cargando tus datos…</p> : pending ? <form className="auth-form google-signup-form" onSubmit={event => void createAccount(event)}>
          <div className="profile-photo-row">
            {preview
              ? <img className="profile-avatar-preview" src={preview} alt="Vista previa de tu foto" />
              : <span className="profile-avatar-preview profile-avatar-placeholder" aria-hidden="true">{(name || pending.correo || '?').slice(0, 1).toUpperCase()}</span>}
            <div className="profile-photo-actions">
              <label className="photo-picker">Elegir foto<input type="file" accept="image/png,image/jpeg" onChange={event => setPhoto(event.target.files?.[0] || null)} /></label>
              {photo && <button type="button" className="profile-secondary" onClick={() => setPhoto(null)}>Quitar foto</button>}
              <small>Opcional · PNG o JPG · máximo 5 MB</small>
            </div>
          </div>

          <label>Nombre para mostrar<input name="nombre" autoComplete="name" value={name} onChange={event => setName(event.target.value)} maxLength={150} required /></label>
          <label>Correo de Google<input value={pending.correo} readOnly /></label>

          <div className="legal-consent"><span className="consent-icon">⌁</span><div><strong>Tu cuenta, bajo tu control</strong>
            <p>Tratamos los datos de tu cuenta para gestionar el acceso y asociar tus publicaciones, en el marco de la Ley 1581 de 2012 (Habeas Data). Consulta los <a href="/terminos">términos y condiciones</a> y <a href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noreferrer">el texto de la ley</a>.</p>
            <label className="consent-check"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} required /><span>Acepto los términos y el aviso sobre el tratamiento de mis datos.</span></label>
          </div></div>

          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={!session || !accepted || busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'} <span aria-hidden="true">→</span></button>
        </form> : <div className="google-signup-error" role="alert">
          <p>{error || 'No encontramos un registro de Google pendiente.'}</p>
          <a className="button-link" href="/registro">Volver a crear cuenta</a>
        </div>}
      </div>
    </main>
    <SiteFooter />
  </div>
}
