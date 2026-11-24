import { useEffect, useState } from 'react'
import { api, guardarDestinoAutenticacion, hora, write } from './api'
import type { Session } from './api'

type Post = { id: number; autor_id: number; autor: string; texto: string; categoria?: string; creado_en: string }
type Page = { resultados: Post[]; paginas: number }
type Locality = { slug: string; nombre: string }

export default function Community({ initialLocality }: { initialLocality: string }) {
  const [session, setSession] = useState<Session>()
  const [localities, setLocalities] = useState<Locality[]>([])
  const [locality, setLocality] = useState(initialLocality)
  const [reports, setReports] = useState<Page>()
  const [reportPage, setReportPage] = useState(1)
  const [thread, setThread] = useState<number>()
  const [comments, setComments] = useState<Page>()
  const [commentPage, setCommentPage] = useState(1)
  const [revision, refresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(() => {
    const status = new URLSearchParams(window.location.search).get('acceso')
    if (status === 'ok') return 'Acceso con Google confirmado.'
    if (status === 'vincular_desde_cuenta') return 'Entra con tu cuenta y elige Vincular Google.'
    if (status === 'cancelado') return 'Acceso con Google cancelado.'
    if (status === 'cuenta_baneada') return 'Esta cuenta está baneada y no puede iniciar sesión. Si crees que es un error, contacta con el equipo moderador.'
    if (status === 'cuenta_suspendida') return 'Esta cuenta está suspendida. Inicia sesión con correo y contraseña para consultar los detalles.'
    return status ? 'No se pudo completar el acceso con Google.' : ''
  })
  useEffect(() => {
    api<Session>('/sesion').then(setSession).catch(e => setNotice(e.message))
    api<{ resultados: Locality[] }>('/localidades').then(data => setLocalities(data.resultados)).catch(e => setNotice(e.message))
    if (new URLSearchParams(window.location.search).has('acceso')) history.replaceState(null, '', '/comunidad')
  }, [])
  useEffect(() => {
    function receiveSession(event: Event) {
      setSession((event as CustomEvent<Session>).detail)
    }
    window.addEventListener('airbyte:session-update', receiveSession)
    return () => window.removeEventListener('airbyte:session-update', receiveSession)
  }, [])
  useEffect(() => {
    let active = true
    api<Page>('/reportes?' + new URLSearchParams({ localidad: locality, pagina: String(reportPage) }))
      .then(data => { if (active) setReports(data) }).catch(e => { if (active) setNotice(e.message) })
    return () => { active = false }
  }, [locality, reportPage, revision])
  useEffect(() => {
    if (thread === undefined) return
    let active = true
    api<Page>('/reportes/' + thread + '/comentarios?pagina=' + commentPage)
      .then(data => { if (active) setComments(data) }).catch(e => { if (active) setNotice(e.message) })
    return () => { active = false }
  }, [thread, commentPage, revision])
  async function submit(action: () => Promise<void>) {
    setBusy(true)
    setNotice('')
    try { await action() }
    catch (e) { setNotice((e as Error).message) }
    finally { setBusy(false) }
  }
  function google(accion: string) {
    if (session) void submit(async () => {
      const data = await write<{ url: string }>('/auth/google/iniciar', 'POST', session.csrf, { accion })
      window.location.assign(data.url)
    })
  }
  function remove(path: string) {
    if (!session || !window.confirm('¿Eliminar esta publicación?')) return
    void submit(async () => {
      await write(path, 'DELETE', session.csrf)
      setThread(undefined)
      setReportPage(1)
      refresh(n => n + 1)
    })
  }
  function hideReport(id: number) {
    const current = session
    if (!current?.usuario?.puede_moderar || !window.confirm('¿Ocultar este reporte? Dejará de aparecer en la comunidad, pero se conservará para moderación.')) return
    void submit(async () => {
      await write(`/reportes/${id}/ocultar`, 'POST', current.csrf)
      setThread(undefined)
      setComments(undefined)
      setReportPage(1)
      refresh(n => n + 1)
      setNotice('El reporte se ocultó de la comunidad y quedó registrado para moderación.')
    })
  }
  function hideComment(id: number) {
    const current = session
    if (!current?.usuario?.puede_moderar || !window.confirm('¿Ocultar este comentario? Dejará de aparecer en la comunidad y quedará registrado para moderación.')) return
    void submit(async () => {
      await write(`/comentarios/${id}/ocultar`, 'POST', current.csrf)
      setComments(undefined)
      refresh(n => n + 1)
      setNotice('El comentario se ocultó de la comunidad y quedó registrado para moderación.')
    })
  }
  return <section id="comunidad">
    <h1>Comunidad por localidad</h1><p>Percepciones de la ciudadanía sobre olores, humo y quemas.</p>
    <div className="panel">
      {notice && <p role="status">{notice}</p>}
      {session?.usuario && session.google_disponible && !session.usuario.google_vinculado && <div className="actions community-google-link">
        <button disabled={busy} onClick={() => google('vincular')}>Vincular Google</button>
      </div>}
      {session && !session.usuario && <div className="report-login-gate"><span className="gate-icon">↗</span><div><strong>Inicia sesión para publicar</strong><p>Los reportes y comentarios ayudan a entender lo que ocurre en cada localidad.</p></div><a className="button-link" href="/login" onClick={() => guardarDestinoAutenticacion(`/comunidad?localidad=${encodeURIComponent(locality)}`)}>Iniciar sesión</a><a href="/registro" onClick={() => guardarDestinoAutenticacion(`/comunidad?localidad=${encodeURIComponent(locality)}`)}>Crear cuenta</a></div>}
      <label>Localidad<select value={locality} onChange={e => {
        setLocality(e.target.value); setReportPage(1); setThread(undefined); setReports(undefined)
      }}>{localities.map(l => <option key={l.slug} value={l.slug}>{l.nombre}</option>)}</select></label>
      {session?.usuario && <form onSubmit={e => {
        e.preventDefault()
        const form = e.currentTarget
        const data = Object.fromEntries(new FormData(form))
        void submit(async () => {
          await write('/reportes', 'POST', session.csrf, { ...data, localidad: locality })
          form.reset(); setReportPage(1); refresh(n => n + 1)
        })
      }}>
        <label>Categoría<select name="categoria">{['olor', 'humo', 'quema', 'otro'].map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Describe lo que observaste<textarea name="texto" required maxLength={1000} /></label>
        <button disabled={busy}>Publicar reporte</button>
      </form>}
      {reports?.resultados.length === 0 && <p>Aún no hay reportes en esta localidad.</p>}
      {reports?.resultados.map(report => <article key={report.id}>
        <h3>{report.categoria} · {report.autor}{session?.usuario?.id === report.autor_id && <span className="community-own-tag"> | tú</span>}</h3><time dateTime={report.creado_en}>{hora(report.creado_en)}</time>
        <p>{report.texto}</p>
        <div className="actions">
          <button aria-expanded={thread === report.id} onClick={() => {
            setThread(thread === report.id ? undefined : report.id); setCommentPage(1); setComments(undefined)
          }}>{thread === report.id ? 'Cerrar comentarios' : 'Ver comentarios'}</button>
          {session?.usuario?.id === report.autor_id && <button onClick={() => remove('/reportes/' + report.id)}>Eliminar reporte</button>}
          {session?.usuario?.puede_moderar && report.autor_id !== session.usuario.id && <button className="moderate-report" disabled={busy} onClick={() => hideReport(report.id)}>Ocultar reporte</button>}
        </div>
        {thread === report.id && <div className="thread">
          {comments?.resultados.length === 0 && <p>Aún no hay comentarios.</p>}
          {comments?.resultados.map(comment => <div key={comment.id}>
            <strong>{comment.autor}</strong> · <time dateTime={comment.creado_en}>{hora(comment.creado_en)}</time>
            <p>{comment.texto}</p>
            {session?.usuario?.id === comment.autor_id && <button onClick={() => remove('/comentarios/' + comment.id)}>Eliminar comentario</button>}
            {session?.usuario?.puede_moderar && comment.autor_id !== session.usuario.id && <button className="moderate-report" disabled={busy} onClick={() => hideComment(comment.id)}>Ocultar comentario</button>}
          </div>)}
          <Pagination current={commentPage} total={comments?.paginas} setPage={setCommentPage} />
          {session?.usuario && <form onSubmit={e => {
            e.preventDefault()
            const form = e.currentTarget
            const data = Object.fromEntries(new FormData(form))
            void submit(async () => {
              await write('/reportes/' + report.id + '/comentarios', 'POST', session.csrf, data)
              form.reset(); refresh(n => n + 1)
            })
          }}><label>Comentario<textarea name="texto" required maxLength={500} /></label>
            <button disabled={busy}>Publicar comentario</button></form>}
          {!session?.usuario && <p><a href="/login" onClick={() => guardarDestinoAutenticacion(`/comunidad?localidad=${encodeURIComponent(locality)}`)}>Inicia sesión para comentar.</a></p>}
        </div>}
      </article>)}
      <Pagination current={reportPage} total={reports?.paginas} setPage={setReportPage} />
    </div>
  </section>
}

function Pagination({ current, total = 1, setPage }: { current: number; total?: number; setPage: (page: number) => void }) {
  if (total <= 1) return null
  return <div className="actions">
    <button disabled={current <= 1} onClick={() => setPage(current - 1)}>Anterior</button>
    <span>{current} de {total}</span>
    <button disabled={current >= total} onClick={() => setPage(current + 1)}>Siguiente</button>
  </div>
}

