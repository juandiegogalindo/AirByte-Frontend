import { SiteFooter, SiteHeader } from './SiteChrome'
import './Auth.css'

const sections = [
  ['01', 'Sobre Air-Byte', 'Air-Byte permite consultar mediciones horarias de calidad del aire, ver estimaciones de PM2,5 y compartir observaciones ciudadanas por localidad. La disponibilidad y actualización de las mediciones dependen de la Red de Monitoreo de Calidad del Aire de Bogotá (RMCAB).'],
  ['02', 'Mediciones y pronósticos', 'Las mediciones oficiales se identifican con su fuente y hora. Los pronósticos son estimaciones de un modelo y pueden diferir de las mediciones posteriores, especialmente durante episodios de concentración alta. La información es orientativa y no reemplaza alertas o indicaciones de las autoridades de salud y ambiente.'],
  ['03', 'Cuenta, datos personales y Ley 1581', 'Para gestionar tu cuenta guardamos el nombre de usuario y, si lo proporcionas, el correo electrónico. Si eliges Google, conservamos el identificador de tu cuenta y, si Google lo confirma, el correo asociado. No guardamos los tokens de acceso de Google. La sesión se mantiene mediante una cookie del servicio. Este aviso describe el tratamiento de datos personales de Air-Byte en el marco de la Ley 1581 de 2012 (Habeas Data). La ley reconoce, entre otros, los derechos a conocer, actualizar y rectificar los datos personales; la revocatoria de autorización y la supresión se sujetan a las condiciones legales aplicables.'],
  ['04', 'Reportes y comentarios', 'Necesitas una sesión activa para publicar. El autor es responsable del contenido que comparte. No publiques datos personales propios o de otras personas, contenido que identifique a menores ni información que pueda poner a alguien en riesgo. El equipo moderador puede ocultar publicaciones y suspender o banear cuentas que vulneren estas reglas.'],
  ['05', 'Tus publicaciones y tu cuenta', 'Puedes eliminar tus propios reportes y comentarios desde la aplicación. Al eliminar un reporte, también se retiran sus comentarios. La moderación puede conservar el registro administrativo de la acción para mantener la trazabilidad del servicio.'],
  ['06', 'Uso del servicio', 'Usa Air-Byte de forma respetuosa y no intentes interferir con su disponibilidad, acceder a cuentas ajenas o presentar estimaciones como mediciones oficiales. El servicio puede cambiar a medida que evolucione el proyecto.'],
]

export default function TermsPage() {
  return <div className="terms-page">
    <SiteHeader />
    <main className="terms-main">
      <div className="terms-heading"><span className="eyebrow">AIR-BYTE · INFORMACIÓN DEL SERVICIO</span><h1>Términos y condiciones</h1><p>Cómo funciona Air-Byte, qué datos utiliza y qué debes tener en cuenta al participar.</p></div>
      <div className="terms-layout"><aside className="terms-index"><strong>En esta página</strong>{sections.map(([id, title]) => <a key={id} href={'#clausula-' + id}>{id} · {title}</a>)}</aside><div className="terms-sections">{sections.map(([id, title, body]) => <section className="terms-section" id={'clausula-' + id} key={id}><span className="eyebrow">CLÁUSULA {id}</span><h2>{title}</h2><p>{body}</p>{id === '03' && <a href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noreferrer">Consultar texto oficial de la Ley 1581 de 2012 ↗</a>}</section>)}<p className="terms-updated">Versión 1.0 · 19 de noviembre de 2026</p></div></div>
    </main>
    <SiteFooter />
  </div>
}
