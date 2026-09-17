import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi.js'

export function useOnboarding() {
  const { isAuthenticated, isLoading } = useAuth0()
  const [synced, setSynced] = useState(false)
  const api      = useApi()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isLoading || !isAuthenticated || synced) return
    if (['/onboarding', '/callback'].includes(location.pathname)) return

    const sync = async () => {
      try {
        const { data } = await api.post('/api/v1/auth/sync')
        await queryClient.invalidateQueries({ queryKey: ['current-user'] })
        const roleHome = {
          DELIVERY: '/driver',
          RESTAURANT_OWNER: '/restaurant-dashboard',
          ADMIN: '/admin',
          MARKETING_ADMIN: '/adminMark',
          CONSUMER: '/',
        }
        const loginRole = sessionStorage.getItem('foodinka_login_role')
        sessionStorage.removeItem('foodinka_login_role')

        // Al iniciar sesión, la ruta se decide por el rol real almacenado
        // en la cuenta, no solo por la opción que se presionó en el modal.
        if (loginRole) {
          navigate(roleHome[data.data?.role] || '/', { replace: true })
          return
        }

        // Solo redirigir al onboarding si es usuario NUEVO
        if (data.message === 'Usuario creado') {
          const target = sessionStorage.getItem('foodinka_registration_target')
          sessionStorage.removeItem('foodinka_registration_target')
          navigate(target || '/onboarding')
        }
      } catch (err) {
        // 409 = usuario ya existe → no es error, continuar normalmente
        if (err.response?.status !== 409) {
          console.error('Error al sincronizar usuario:', err.message)
        }
      } finally {
        setSynced(true)
      }
    }

    sync()
  }, [api, isAuthenticated, isLoading, location.pathname, navigate, queryClient, synced])

  return { synced }
}
