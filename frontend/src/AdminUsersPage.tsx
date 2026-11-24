import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, guardarDestinoAutenticacion, write } from './api'
import type { Session } from './api'
import { SiteFooter, SiteHeader } from './SiteChrome'
import './AdminUsers.css'

type AdminUser = {
  id: number
  usuario: string
  nombre: string
  correo: string
  rol: string
  activo: boolean
  google_vinculado: boolean
  creado_en: string
}

type AdminUsers = { resultados: AdminUser[]; total: number; limite: number }
type UserDraft = { usuario: string; nombre: string; correo: string; rol: string; activo: boolean; contrasena: string }
const NUEVO_USUARIO: UserDraft = { usuario: '', nombre: '', correo: '', rol: 'Usuario', activo: true, contrasena: '' }

function fecha(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(value))
}

export default function AdminUsersPage() {
  const [session, setSession] = useState<Session>()
  const [users, setUsers] = useState<AdminUsers>()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<UserDraft | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const current = await api<Session>('/sesion')
        if (!current.usuario) {
          guardarDestinoAutenticacion('/administracion')
          window.location.replace('/login')
          return
        }
        if (!current.usuario.es_admin) {
          window.location.replace('/403')
          return
        }
        const data = await api<AdminUsers>('/administracion/usuarios')
        if (!active) return
        setSession(current)
        setUsers(data)
      } catch (cause) {
        if (active) setError((cause as Error).message)
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
        setUsers(undefined)
        guardarDestinoAutenticacion('/administracion')
        window.location.replace('/login')
      } else if (!current.usuario.es_admin) {
        setUsers(undefined)
        window.location.replace('/403')
      }
    }
    window.addEventListener('airbyte:session-update', receiveSession)
    return () => window.removeEventListener('airbyte:session-update', receiveSession)
  }, [])

  function createUser() {
    setEditingId(null)
    setDraft({ ...NUEVO_USUARIO })
    setActionError('')
    setNotice('')
  }

  function editUser(user: AdminUser) {
    setEditingId(user.id)
    setDraft({ usuario: user.usuario, nombre: user.nombre, correo: user.correo,
      rol: user.rol, activo: user.activo, contrasena: '' })
    setActionError('')
    setNotice('')
  }

  function closeEditor() {
    setDraft(null)
    setEditingId(null)
    setActionError('')
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !draft) return
    setSaving(true)
    setActionError('')
    setNotice('')
    try {
      const updated = await write<AdminUser>(
        editingId === null ? '/administracion/usuarios' : `/administracion/usuarios/${editingId}`,
        editingId === null ? 'POST' : 'PATCH',
        session.csrf,
        draft,
      )
      setUsers(current => {
        if (!current) return current
        const resultados = editingId === null
          ? [...current.resultados, updated].sort((a, b) => a.usuario.localeCompare(b.usuario, 'es-CO'))
          : current.resultados.map(user => user.id === updated.id ? updated : user)
            .sort((a, b) => a.usuario.localeCompare(b.usuario, 'es-CO'))
        return { ...current, resultados: resultados.slice(0, current.limite), total: editingId === null ? current.total + 1 : current.total }
      })
      setNotice(editingId === null ? 'La cuenta se creó correctamente.' : 'Los cambios se guardaron correctamente.')
      setDraft(null)
      setEditingId(null)
    } catch (cause) {
      setActionError((cause as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!session || user.id === session.usuario?.id || deletingId !== null) return
    const confirmed = window.confirm(`¿Eliminar la cuenta “${user.usuario}”? También se eliminarán sus reportes y comentarios.`)
    if (!confirmed) return
    setDeletingId(user.id)
    setActionError('')
    setNotice('')
    try {
      await write<void>(`/administracion/usuarios/${user.id}`, 'DELETE', session.csrf)
      setUsers(current => current ? {
        ...current,
        resultados: current.resultados.filter(item => item.id !== user.id),
        total: Math.max(0, current.total - 1),
      } : current)
      setNotice(`Se eliminó la cuenta ${user.usuario}.`)
    } catch (cause) {
      setActionError((cause as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('es-CO')
    if (!needle) return users?.resultados ?? []
    return (users?.resultados ?? []).filter(user =>
      [user.usuario, user.nombre, user.correo, user.rol].some(value => value.toLocaleLowerCase('es-CO').includes(needle)))
  }, [users, search])

  const activeCount = users?.resultados.filter(user => user.activo).length ?? 0
  const moderatorCount = users?.resultados.filter(user => user.rol === 'Moderador de contenido').length ?? 0
  const googleCount = users?.resultados.filter(user => user.google_vinculado).length ?? 0

  return <>
    <SiteHeader />
    <main className="admin-main">
      <div className="admin-heading">
        <span className="eyebrow">PANEL DE CONTROL · AIR-BYTE</span>
        <h1>Administración de usuarios</h1>
        <p>Gestiona las cuentas, sus roles, el acceso y el estado de la comunidad.</p>
      </div>

      {loading ? <section className="panel admin-message" role="status">Cargando usuarios…</section>
        : error ? <section className="panel admin-message admin-error" role="alert">{error}</section>
          : users && <>
            <section className="admin-stats" aria-label="Resumen de usuarios">
              <article className="panel admin-stat"><span>Total de cuentas</span><strong>{users.total}</strong></article>
              <article className="panel admin-stat"><span>Cuentas activas</span><strong>{activeCount}</strong></article>
              <article className="panel admin-stat"><span>Moderadores</span><strong>{moderatorCount}</strong></article>
              <article className="panel admin-stat"><span>Vinculadas con Google</span><strong>{googleCount}</strong></article>
            </section>

            <section className="panel admin-users-panel">
              <div className="admin-users-heading">
                <div><span className="eyebrow">CUENTAS REGISTRADAS</span><h2>Usuarios</h2></div>
                <div className="admin-users-tools">
                  <label className="admin-search">Buscar<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre, usuario o correo" /></label>
                  <button className="admin-create-button" type="button" onClick={createUser}>Crear usuario</button>
                </div>
              </div>
              {notice && <p className="admin-success" role="status">{notice}</p>}
              {actionError && <p className="admin-error-message" role="alert">{actionError}</p>}
              {draft && <form className="admin-user-form" onSubmit={event => void saveUser(event)}>
                <div className="admin-form-heading">
                  <div><span className="eyebrow">{editingId === null ? 'NUEVA CUENTA' : 'EDITAR CUENTA'}</span><h3>{editingId === null ? 'Crear usuario' : `Editar ${draft.usuario}`}</h3></div>
                  <button className="admin-quiet-button" type="button" onClick={closeEditor} disabled={saving}>Cancelar</button>
                </div>
                <div className="admin-form-grid">
                  <label>Nombre de usuario<input autoComplete="off" required minLength={1} maxLength={150} value={draft.usuario} onChange={event => setDraft({ ...draft, usuario: event.target.value })} /></label>
                  <label>Nombre para mostrar<input autoComplete="name" maxLength={150} value={draft.nombre} onChange={event => setDraft({ ...draft, nombre: event.target.value })} /></label>
                  <label>Correo electrónico<input type="email" autoComplete="email" maxLength={254} value={draft.correo} onChange={event => setDraft({ ...draft, correo: event.target.value })} /></label>
                  <label>Rol<select value={draft.rol} onChange={event => setDraft({ ...draft, rol: event.target.value })} disabled={editingId === session?.usuario?.id}>
                    <option>Usuario</option><option>Moderador de contenido</option><option>Administrador</option>
                  </select></label>
                  <label className="admin-password-field">{editingId === null ? 'Contraseña inicial' : 'Nueva contraseña · opcional'}<input type="password" autoComplete="new-password" required={editingId === null} minLength={8} maxLength={1024} value={draft.contrasena} onChange={event => setDraft({ ...draft, contrasena: event.target.value })} placeholder={editingId === null ? 'Al menos 8 caracteres' : 'Déjala vacía para conservarla'} /></label>
                  <label className="admin-active-toggle"><input type="checkbox" checked={draft.activo} disabled={editingId === session?.usuario?.id} onChange={event => setDraft({ ...draft, activo: event.target.checked })} /> Cuenta activa</label>
                </div>
                {editingId !== null && <p className="admin-form-note">Al cambiar la contraseña, el usuario tendrá que usar la nueva la próxima vez que inicie sesión.</p>}
                {editingId === session?.usuario?.id && <p className="admin-form-note">No puedes cambiar tu propio rol ni desactivar tu cuenta desde aquí.</p>}
                <div className="admin-form-actions"><button className="admin-create-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : editingId === null ? 'Crear cuenta' : 'Guardar cambios'}</button></div>
              </form>}
              {users.total > users.limite && <p className="admin-limit">Se muestran las primeras {users.limite} cuentas.</p>}
              <div className="admin-table-wrap">
                <table className="admin-users-table">
                  <thead><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th><th>Estado</th><th>Creación</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {filteredUsers.map(user => <tr key={user.id}>
                      <td><strong>{user.usuario}</strong></td>
                      <td>{user.nombre || '—'}</td>
                      <td>{user.correo || '—'}</td>
                      <td><span className={'admin-role ' + (user.rol === 'Administrador' ? 'is-admin' : user.rol === 'Moderador de contenido' ? 'is-moderator' : '')}>{user.rol}</span></td>
                      <td>{user.google_vinculado ? 'Google' : 'Contraseña'}</td>
                      <td><span className={'admin-state ' + (user.activo ? 'is-active' : 'is-inactive')}>{user.activo ? 'Activa' : 'Inactiva'}</span></td>
                      <td>{fecha(user.creado_en)}</td>
                      <td><div className="admin-row-actions"><button type="button" aria-label={`Editar a ${user.usuario}`} onClick={() => editUser(user)}>Editar</button><button className="admin-delete-button" type="button" aria-label={`Eliminar a ${user.usuario}`} onClick={() => void deleteUser(user)} disabled={user.id === session?.usuario?.id || deletingId !== null}>{deletingId === user.id ? 'Eliminando…' : 'Eliminar'}</button></div></td>
                    </tr>)}
                    {!filteredUsers.length && <tr><td className="admin-empty" colSpan={8}>{search ? 'No hay usuarios que coincidan con la búsqueda.' : 'Todavía no hay usuarios registrados.'}</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="admin-results">Mostrando {filteredUsers.length} de {users.total} cuentas{session?.usuario ? ` · Sesión: ${session.usuario.usuario}` : ''}.</p>
            </section>
          </>}
    </main>
    <SiteFooter />
  </>
}
