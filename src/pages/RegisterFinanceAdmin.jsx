import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { Loader2, WalletCards } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from '../hooks/useApi.js'
import { setAuthToken } from '../config/api.js'
import './RegisterAdmin.css'

export default function RegisterFinanceAdmin() {
  const navigate = useNavigate(); const api = useApi(); const queryClient = useQueryClient()
  const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()
  const inviteToken = new URLSearchParams(window.location.search).get('invite')
  const [error, setError] = useState(''); const [registering, setRegistering] = useState(false); const attempted = useRef(false)
  const login = createAccount => loginWithRedirect({ authorizationParams: createAccount ? { screen_hint: 'signup' } : { prompt: 'login' }, appState: { returnTo: `${window.location.pathname}${window.location.search}` } })
  useEffect(() => {
    if (!isAuthenticated || registering || attempted.current || !inviteToken) return
    attempted.current = true; setRegistering(true)
    const register = async () => {
      try {
        setAuthToken(await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }))
        await api.post('/api/v1/auth/register-finance-admin', { inviteToken })
        await queryClient.invalidateQueries({ queryKey: ['current-user'] })
        navigate('/adminFin', { replace: true })
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudo registrar el administrador financiero')
        setRegistering(false)
      }
    }
    register()
  }, [api, getAccessTokenSilently, inviteToken, isAuthenticated, navigate, queryClient, registering])
  return <div className="admin-register-page"><main className="admin-register-card"><WalletCards size={48}/><h1>Administrador financiero</h1>{!inviteToken ? <p className="admin-register-error">Necesitas el enlace de invitación del administrador principal.</p> : isLoading || registering ? <p><Loader2 size={18}/> Preparando tu acceso…</p> : !isAuthenticated ? <><p>Crea tu cuenta de Auth0 o inicia sesión para vincular este enlace.</p><button onClick={() => login(true)}>Crear cuenta con Auth0</button><button onClick={() => login(false)}>Iniciar sesión</button></> : error ? <><p className="admin-register-error">{error}</p><button onClick={() => login(false)}>Iniciar sesión con otro correo</button></> : <p><Loader2 size={18}/> Registrando tu acceso financiero…</p>}</main></div>
}
