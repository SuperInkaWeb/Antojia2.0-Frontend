import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { Loader2, ChartNoAxesCombined } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '../hooks/useApi.js'
import { setAuthToken } from '../config/api.js'
import Navbar from '../components/layout/Navbar.jsx'
import './RegisterAdmin.css'

export default function RegisterMarketingAdmin() {
  const navigate = useNavigate()
  const api = useApi()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()
  const inviteToken = new URLSearchParams(window.location.search).get('invite')
  const [error, setError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const login = createAccount => loginWithRedirect({ authorizationParams: createAccount ? { screen_hint: 'signup' } : { prompt: 'login' }, appState: { returnTo: `${window.location.pathname}${window.location.search}` } })

  useEffect(() => {
    if (!isAuthenticated || registering || attempted || !inviteToken) return
    const register = async () => {
      setAttempted(true)
      setRegistering(true)
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })
        setAuthToken(token)
        await api.post('/api/v1/auth/register-marketing-admin', { inviteToken })
        await queryClient.invalidateQueries({ queryKey: ['current-user'] })
        navigate('/adminMark', { replace: true })
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudo registrar el administrador de marketing')
        setRegistering(false)
      }
    }
    register()
  }, [api, attempted, getAccessTokenSilently, inviteToken, isAuthenticated, navigate, queryClient, registering])

  return <div className="admin-register-page"><Navbar /><main className="admin-register-card">
    <ChartNoAxesCombined size={48} /><h1>Administrador de marketing</h1>
    {!inviteToken ? <p className="admin-register-error">Para registrarte necesitas el enlace de invitación del administrador principal.</p>
      : isLoading || registering ? <p><Loader2 size={18} className="admin-register-spin"/> Preparando tu acceso…</p>
      : !isAuthenticated ? <><p>Crea tu cuenta de Auth0 o inicia sesión. Este enlace se vinculará al primer correo que lo use.</p><button onClick={()=>login(true)}>Crear cuenta con Auth0</button><button onClick={()=>login(false)}>Iniciar sesión</button></>
      : error ? <><p className="admin-register-error">{error}</p><button onClick={()=>login(false)}>Iniciar sesión con otro correo</button></> : null}
  </main></div>
}
