import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '../hooks/useApi.js'
import { setAuthToken } from '../config/api.js'
import Navbar from '../components/layout/Navbar.jsx'
import './RegisterAdmin.css'

export default function RegisterAdmin() {
  const navigate = useNavigate()
  const api = useApi()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()
  const [error, setError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const login = () => loginWithRedirect({
    authorizationParams: { prompt: 'login' },
    appState: { returnTo: window.location.pathname },
  })

  useEffect(() => {
    if (!isAuthenticated || registering || attempted) return
    const register = async () => {
      setAttempted(true)
      setRegistering(true)
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
          scope: 'openid profile email',
        })
        setAuthToken(token)
        await api.post('/api/v1/auth/register-admin')
        await queryClient.invalidateQueries({ queryKey: ['current-user'] })
        navigate('/admin', { replace: true })
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'No se pudo registrar el administrador')
        setRegistering(false)
      }
    }
    register()
  }, [api, attempted, getAccessTokenSilently, isAuthenticated, navigate, queryClient, registering])

  return <div className="admin-register-page">
    <Navbar />
    <main className="admin-register-card">
      <ShieldCheck size={48} />
      <h1>Acceso de administrador</h1>
      {isLoading || registering ? <p><Loader2 size={18} className="admin-register-spin"/> Preparando tu acceso…</p>
        : !isAuthenticated ? <><p>Inicia sesión o crea tu cuenta para activar el panel de administrador.</p><button onClick={login}>Continuar</button></>
        : error ? <><p className="admin-register-error">{error}</p><button onClick={login}>Iniciar sesión como administrador</button></>
        : null}
    </main>
  </div>
}
