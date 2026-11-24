import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AuthPage from './AuthPage'
import GoogleSignupPage from './GoogleSignupPage'
import AdminUsersPage from './AdminUsersPage'
import ModerationPage from './ModerationPage'
import CommunityPage from './CommunityPage'
import ProfilePage from './ProfilePage'
import TermsPage from './TermsPage'
import ErrorPage from './ErrorPage'

try { document.body.dataset.theme = localStorage.getItem('airbyte-theme') === 'light' ? 'light' : 'dark' }
catch { document.body.dataset.theme = 'dark' }

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const errorMatch = path.match(/^\/(?:error\/)?(400|401|403|404|405|429|500|502|503)$/)
const errorStatus = errorMatch ? Number(errorMatch[1]) : undefined
document.title = errorStatus ? `${errorStatus} · Air-Byte`
  : path === '/login' ? 'Iniciar sesión · Air-Byte'
  : path === '/registro' ? 'Crear cuenta · Air-Byte'
    : path === '/registro/google' ? 'Completa tu perfil · Air-Byte'
    : path === '/comunidad' ? 'Comunidad · Air-Byte'
    : path === '/administracion' ? 'Administración · Air-Byte'
    : path === '/moderacion' ? 'Moderación · Air-Byte'
    : path === '/perfil' ? 'Mi perfil · Air-Byte'
    : path === '/terminos' ? 'Términos y condiciones · Air-Byte'
      : 'Air-Byte · Calidad del aire en Bogotá'
const page = path === '/login' ? <AuthPage mode="login" />
  : path === '/registro' ? <AuthPage mode="registro" />
    : path === '/registro/google' ? <GoogleSignupPage />
    : path === '/comunidad' ? <CommunityPage />
    : path === '/administracion' ? <AdminUsersPage />
    : path === '/moderacion' ? <ModerationPage />
    : path === '/perfil' ? <ProfilePage />
    : path === '/terminos' ? <TermsPage />
      : errorStatus ? <ErrorPage status={errorStatus} />
        : path === '/' ? <App />
          : <ErrorPage status={404} />

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? <ErrorPage status={500} /> : this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>{page}</AppErrorBoundary>
  </StrictMode>,
)
