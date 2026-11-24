import { useEffect, useMemo, useState } from 'react'
import { api, guardarDestinoAutenticacion, write } from './api'
import type { Session } from './api'
import { SiteFooter, SiteHeader } from './SiteChrome'
import './ModerationPage.css'

type Account = {
  id: number
  usuario: string
  nombre: string
  correo: string
  rol: string
  activo: boolean
  google_vinculado: boolean
  estado_sancion: 'normal' | 'suspension' | 'baneo' | 'inactiva'
  motivo_sancion: string
  sancion_hasta: string | null
  creado_en: string
}
type Accounts = { resultados: Account[]; total: number; limite: number }
type Draft = { accion: 'suspender' | 'banear'; dias: number; motivo: string }

function fecha(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(value))
}

export default function ModerationPage() {
  const [session, setSession] = useState<Session>()
  const [accounts, setAccounts] = useState<Accounts>()
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [openId, setOpenId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const current = await api<Session>('/sesion')
        if (!current.usuario) {
          guardarDestinoAutenticacion('/moderacion')
          window.location.replace('/login')
          return
        }
        if (!current.usuario.puede_moderar_cuentas) {
          window.location.replace('/403')
          return
        }
        const data = await api<Accounts>('/moderacion/usuarios')
        if (active) { setSession(current); setAccounts(data) }
      } catch (cause) {
        if (active) setError((cause as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('es-CO')
    if (!needle) return accounts?.resultados ?? []
    return (accounts?.resultados ?? []).filter(user =>
      [user.usuario, user.nombre, user.correo].some(value => value.toLocaleLowerCase('es-CO').includes(needle)))
  }, [accounts, search])

  function updateAccount(updated: Account) {
    setAccounts(current => current ? { ...current, resultados: current.resultados.map(user => user.id === updated.id ? updated : user) } : current)
  }

  async function apply(user: Account, accion: 'suspender' | 'banear' | 'levantar') {
    if (!session || busyId !== null) return
    const draft = drafts[user.id] ?? { accion: 'suspender', dias: 7, motivo: '' }
    const isLift = accion === 'levantar'
    const label = accion === 'banear' ? 'banear permanentemente' : accion === 'suspender' ? `suspender por ${draft.dias} días` : 'levantar la sanción'
    if (!window.confirm(`¿Quieres ${label} a “${user.usuario}”${isLift ? '?' : ` por este motivo: ${draft.motivo || '(sin motivo)'}`}?`)) return
    setBusyId(user.id); setError(''); setNotice('')
    try {
      const updated = await write<Account>(`/moderacion/usuarios/${user.id}/sancion`, 'POST', session.csrf,
        isLift ? { accion } : { accion, motivo: draft.motivo, ...(accion === 'suspender' ? { dias: draft.dias } : {}) })
      updateAccount(updated)
      setOpenId(null)
      setNotice(isLift ? `Se levantó la sanción de ${user.usuario}.` : accion === 'banear' ? `Se baneó a ${user.usuario}.` : `Se suspendió a ${user.usuario}.`)
    } catch (cause) { setError((cause as Error).message) }
    finally { setBusyId(null) }
  }

  return <>
    <SiteHeader />
    <main className="moderation-main">
      <div className="moderation-heading"><span className="eyebrow">COMUNIDAD · MODERACIÓN</span><h1>Moderación de cuentas</h1><p>Aplica suspensiones temporales o baneos permanentes cuando una cuenta incumpla las normas.</p></div>
      {loading ? <section className="panel moderation-message" role="status">Cargando cuentas…</section>
        : error && !accounts ? <section className="panel moderation-message moderation-error" role="alert">{error}</section>
          : <section className="panel moderation-panel">
            <div className="moderation-toolbar"><div><span className="eyebrow">CUENTAS REGISTRADAS</span><h2>Usuarios · {accounts?.total ?? 0}</h2></div>
              <label>Buscar<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre, usuario o correo" /></label>
            </div>
            {notice && <p className="moderation-notice" role="status">{notice}</p>}
            {error && <p className="moderation-error-text" role="alert">{error}</p>}
            <div className="moderation-list">
              {filtered.map(user => {
                const draft = drafts[user.id] ?? { accion: 'suspender' as const, dias: 7, motivo: '' }
                const hasSanction = user.estado_sancion === 'suspension' || user.estado_sancion === 'baneo'
                const protectedAccount = user.rol === 'Administrador' || user.id === session?.usuario?.id
                const stateLabel = user.estado_sancion === 'suspension' ? `Suspendida hasta ${fecha(user.sancion_hasta)}`
                  : user.estado_sancion === 'baneo' ? 'Baneada permanentemente'
                    : user.estado_sancion === 'inactiva' ? 'Desactivada por administración' : 'Activa'
                return <article className="moderation-user" key={user.id}>
                  <div className="moderation-user-top"><div><h3>{user.nombre || user.usuario}</h3><p>@{user.usuario} · {user.correo || 'Sin correo'} · {user.rol}</p></div>
                    <span className={`moderation-state is-${user.estado_sancion}`}>{stateLabel}</span></div>
                  {hasSanction && <p className="moderation-reason"><strong>Motivo:</strong> {user.motivo_sancion}</p>}
                  {!protectedAccount && user.estado_sancion !== 'inactiva' && <div className="moderation-actions">
                    {hasSanction
                      ? <><button className="moderation-lift" type="button" disabled={busyId !== null} onClick={() => void apply(user, 'levantar')}>{busyId === user.id ? 'Guardando…' : 'Levantar sanción'}</button>
                        <button type="button" disabled={busyId !== null} onClick={() => { setOpenId(openId === user.id ? null : user.id); setError('') }}>Cambiar sanción</button></>
                      : <button type="button" disabled={busyId !== null} onClick={() => { setOpenId(openId === user.id ? null : user.id); setError('') }}>Suspender o banear</button>}
                  </div>}
                  {openId === user.id && !protectedAccount && <form className="moderation-form" onSubmit={event => { event.preventDefault(); void apply(user, draft.accion) }}>
                    <label>Medida<select value={draft.accion} onChange={event => setDrafts(current => ({ ...current, [user.id]: { ...draft, accion: event.target.value as Draft['accion'] } }))}>
                      <option value="suspender">Suspender temporalmente</option><option value="banear">Banear permanentemente</option></select></label>
                    {draft.accion === 'suspender' && <label>Duración<select value={draft.dias} onChange={event => setDrafts(current => ({ ...current, [user.id]: { ...draft, dias: Number(event.target.value) } }))}>
                      <option value={1}>1 día</option><option value={7}>7 días</option><option value={30}>30 días</option></select></label>}
                    <label className="moderation-reason-field">Motivo<textarea required maxLength={500} value={draft.motivo} onChange={event => setDrafts(current => ({ ...current, [user.id]: { ...draft, motivo: event.target.value } }))} placeholder="Describe brevemente el incumplimiento" /></label>
                    <div className="moderation-form-actions"><button type="button" onClick={() => setOpenId(null)}>Cancelar</button><button className="moderation-confirm" type="submit" disabled={busyId !== null || !draft.motivo.trim()}>{busyId === user.id ? 'Aplicando…' : draft.accion === 'banear' ? 'Banear cuenta' : 'Suspender cuenta'}</button></div>
                  </form>}
                </article>
              })}
              {!filtered.length && <p className="moderation-empty">No hay cuentas que coincidan con la búsqueda.</p>}
            </div>
            <p className="moderation-footnote">Las suspensiones vencen automáticamente. Las cuentas baneadas conservan el bloqueo hasta que una persona moderadora levante la sanción.</p>
          </section>}
    </main>
    <SiteFooter />
  </>
}
