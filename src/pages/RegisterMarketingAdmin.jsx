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
  const [error, setError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const login = () => loginWithRedirect({ authorizationParams: { prompt: 'login' }, appState: { returnTo: '/adminMark/register' } })

  useEffect(() => {
    if (!isAuthenticated || registering || attempted) return
    const register = async () => {
      setAttempted(true)
      setRegistering(true)
      try {
        const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })
        setAuthToken(token)
        await api.post('/api/v1/auth/register-marketing-admin')
        await queryClient.invalidateQueries({ queryKey: ['current-user'] })
        navigate('/adminMark', { replace: true })
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudo registrar el administrador de marketing')
        setRegistering(false)
      }
    }
    register()
  }, [api, attempted, getAccessTokenSilently, isAuthenticated, navigate, queryClient, registering])

  return <div className="admin-register-page"><Navbar /><main className="admin-register-card">
    <ChartNoAxesCombined size={48} /><h1>Administrador de marketing</h1>
    {isLoading || registering ? <p><Loader2 size={18} className="admin-register-spin"/> Preparando tu acceso…</p>
      : !isAuthenticated ? <><p>Inicia sesión o crea tu cuenta para solicitar acceso. Hay un máximo de 2 cuentas.</p><button onClick={login}>Continuar</button></>
      : error ? <><p className="admin-register-error">{error}</p><button onClick={login}>Iniciar sesión</button></> : null}
  </main></div>
}
