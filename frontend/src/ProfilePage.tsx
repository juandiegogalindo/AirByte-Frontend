import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, guardarDestinoAutenticacion, notificarSesionActualizada, write } from './api'
import type { Session } from './api'
import { SiteFooter, SiteHeader } from './SiteChrome'
import './Profile.css'

type Profile = { nombre: string; usuario: string; foto: string | null; tiene_contrasena: boolean }

export default function ProfilePage() {
  const [session, setSession] = useState<Session>()
  const [profile, setProfile] = useState<Profile>()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const currentSession = await api<Session>('/sesion')
        if (!currentSession.usuario) {
          guardarDestinoAutenticacion('/perfil')
          window.location.replace('/login')
          return
        }
        const currentProfile = await api<Profile>('/perfil')
        if (!active) return
        setSession(currentSession)
        setProfile(currentProfile)
        setName(currentProfile.nombre)
        setUsername(currentProfile.usuario)
      } catch (cause) {
        if (active) setProfileError((cause as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    function receiveSession(event: Event) {
      const current = (event as CustomEvent<Session>).detail
      setSession(current)
      if (!current.usuario) {
        guardarDestinoAutenticacion('/perfil')
        window.location.replace('/login')
      }
    }
    window.addEventListener('airbyte:session-update', receiveSession)
    return () => window.removeEventListener('airbyte:session-update', receiveSession)
  }, [])

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreview(null)
      return
    }
    const preview = URL.createObjectURL(selectedPhoto)
    setPhotoPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [selectedPhoto])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setSavingProfile(true)
    setProfileError('')
    setProfileMessage('')
    const data = new FormData()
    data.set('nombre', name)
    data.set('usuario', username)
    if (selectedPhoto) data.set('foto', selectedPhoto)
    if (removePhoto) data.set('eliminar_foto', '1')
    try {
      const saved = await api<Profile>('/perfil', {
        method: 'POST',
        headers: { 'X-CSRFToken': session.csrf },
        body: data,
      })
      setProfile(saved)
      setName(saved.nombre)
      setUsername(saved.usuario)
      setSelectedPhoto(null)
      setRemovePhoto(false)
      const updatedSession = await api<Session>('/sesion')
      setSession(updatedSession)
      notificarSesionActualizada(updatedSession)
      setProfileMessage('Tu perfil se actualizó correctamente.')
    } catch (cause) {
      setProfileError((cause as Error).message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) return
    setSavingPassword(true)
    setPasswordError('')
    setPasswordMessage('')
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    try {
      await write('/perfil/contrasena', 'POST', session.csrf, data)
      form.reset()
      setPasswordMessage('Tu contraseña se actualizó correctamente.')
    } catch (cause) {
      setPasswordError((cause as Error).message)
    } finally {
      setSavingPassword(false)
    }
  }

  const visiblePhoto = photoPreview || (!removePhoto ? profile?.foto : null)

  return <>
    <SiteHeader />
    <main className="profile-main">
      <div className="profile-heading">
        <span className="eyebrow">TU CUENTA · AIR-BYTE</span>
        <h1>Configuración del perfil</h1>
        <p>Actualiza cómo apareces en la comunidad y protege el acceso a tu cuenta.</p>
      </div>

      {loading ? <div className="panel profile-loading" role="status">Cargando tu perfil…</div> : profile ? <div className="profile-grid">
        <section className="panel profile-panel">
          <div className="profile-panel-heading"><div><span className="eyebrow">INFORMACIÓN PERSONAL</span><h2>Tu perfil</h2></div></div>
          <form className="profile-form" onSubmit={event => void saveProfile(event)}>
            <div className="profile-photo-row">
              {visiblePhoto
                ? <img className="profile-avatar-preview" src={visiblePhoto} alt="Vista previa de tu foto de perfil" />
                : <span className="profile-avatar-preview profile-avatar-placeholder" aria-hidden="true">{(name || username || '?').slice(0, 1).toUpperCase()}</span>}
              <div className="profile-photo-actions">
                <label className="photo-picker">Elegir foto<input type="file" accept="image/png,image/jpeg" onChange={event => { setSelectedPhoto(event.target.files?.[0] || null); setRemovePhoto(false) }} /></label>
                {selectedPhoto
                  ? <button type="button" className="profile-secondary" onClick={() => setSelectedPhoto(null)}>Descartar selección</button>
                  : profile.foto && <button type="button" className="profile-secondary" onClick={() => setRemovePhoto(value => !value)}>{removePhoto ? 'Conservar foto' : 'Quitar foto'}</button>}
                <small>PNG o JPG · máximo 5 MB</small>
                {removePhoto && <small className="profile-photo-removed">La foto se quitará al guardar.</small>}
              </div>
            </div>

            <label>Nombre para mostrar<input name="nombre" autoComplete="name" maxLength={150} value={name} onChange={event => setName(event.target.value)} placeholder="Tu nombre" /></label>
            <label>Nombre de usuario<input name="usuario" autoComplete="username" minLength={1} maxLength={150} required value={username} onChange={event => setUsername(event.target.value)} /></label>
            <p className="profile-help">Este nombre aparece junto a tus reportes y comentarios.</p>
            {profileError && <p className="profile-error" role="alert">{profileError}</p>}
            {profileMessage && <p className="profile-success" role="status">{profileMessage}</p>}
            <button className="profile-primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Guardando…' : 'Guardar cambios'}</button>
          </form>
        </section>

        <section className="panel profile-panel">
          <div className="profile-panel-heading"><div><span className="eyebrow">SEGURIDAD</span><h2>Contraseña</h2></div></div>
          {!profile.tiene_contrasena && <p className="profile-google-note">Tu cuenta se creó con Google. Puedes definir una contraseña para iniciar sesión también con tu usuario.</p>}
          <form className="profile-form" onSubmit={event => void changePassword(event)}>
            {profile.tiene_contrasena && <label>Contraseña actual<input name="actual" type="password" autoComplete="current-password" required maxLength={1024} /></label>}
            <label>Nueva contraseña<input name="nueva" type="password" autoComplete="new-password" required minLength={8} maxLength={1024} /></label>
            <label>Confirmar nueva contraseña<input name="confirmacion" type="password" autoComplete="new-password" required minLength={8} maxLength={1024} /></label>
            <p className="profile-help">Usa una contraseña única que no compartas con otros sitios.</p>
            {passwordError && <p className="profile-error" role="alert">{passwordError}</p>}
            {passwordMessage && <p className="profile-success" role="status">{passwordMessage}</p>}
            <button className="profile-primary" type="submit" disabled={savingPassword}>{savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}</button>
          </form>
        </section>
      </div> : <div className="panel profile-loading" role="alert">{profileError || 'No pudimos cargar tu perfil.'}</div>}
    </main>
    <SiteFooter />
  </>
}
