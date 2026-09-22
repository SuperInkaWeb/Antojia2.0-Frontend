import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { api, setAuthToken } from '../config/api.js'
import toast from 'react-hot-toast'

// ── Helper: obtiene token fresco y lo inyecta en axios ────────
function useAuthenticatedQuery(queryKey, endpoint, params = {}, options = {}) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()

  return useQuery({
    queryKey: [queryKey, params],
    queryFn: async () => {
      // 1. Obtener token antes de cada request
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
      setAuthToken(token)

      // 2. Hacer la request
      const { data } = await api.get(endpoint, { params })
      return data
    },
    enabled: isAuthenticated,  // no ejecutar hasta tener sesión
    placeholderData: (prev) => prev,
    ...options,
  })
}

// ── Métricas ──────────────────────────────────────────────────
export function useMetrics() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
      setAuthToken(token)
      const { data } = await api.get('/api/v1/admin/metrics')
      return data.data
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  })
}

export function useRevenueChart() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  return useQuery({
    queryKey: ['admin', 'revenue-chart'],
    queryFn: async () => {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
      setAuthToken(token)
      const { data } = await api.get('/api/v1/admin/metrics/revenue')
      return data.data
    },
    enabled: isAuthenticated,
  })
}

// ── Tablas ────────────────────────────────────────────────────
export function useAdminUsers(params = {}) {
  return useAuthenticatedQuery('admin-users', '/api/v1/admin/users', params)
}

export function useAdminRestaurants(params = {}) {
  return useAuthenticatedQuery('admin-restaurants', '/api/v1/admin/restaurants', params)
}

export function useAdminOrders(params = {}) {
  return useAuthenticatedQuery('admin-orders', '/api/v1/admin/orders', params)
}

export function useAdminPayments(params = {}) {
  return useAuthenticatedQuery('admin-payments', '/api/v1/admin/payments', params)
}

export function useAdminPaymentSummary() {
  return useAuthenticatedQuery('admin-payment-summary', '/api/v1/admin/payments/summary')
}

export function useAdminSettlements() {
  return useAuthenticatedQuery('admin-settlements', '/api/v1/admin/settlements', {}, { refetchInterval: 30000 })
}

export function useMarketingAnalytics(period = 'month') {
  return useAuthenticatedQuery('marketing-analytics', '/api/v1/admin-marketing/analytics', { period }, { refetchInterval: 60000 })
}

export function useMarketingSettlements() {
  return useAuthenticatedQuery('marketing-settlements', '/api/v1/admin-marketing/settlements', {}, { refetchInterval: 30000 })
}

export function useMarketingRewards() {
  return useAuthenticatedQuery('marketing-rewards', '/api/v1/admin-marketing/rewards')
}

export function useMarketingRewardMutations() {
  const { getAccessTokenSilently } = useAuth0(); const qc = useQueryClient()
  const auth = async () => { const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }); setAuthToken(token) }
  const invalidate = () => qc.invalidateQueries({ queryKey: ['marketing-rewards'] })
  const create = useMutation({ mutationFn: async payload => { await auth(); return api.post('/api/v1/admin-marketing/rewards', payload) }, onSuccess: () => { toast.success('Recompensa creada'); invalidate() }, onError: err => toast.error(err?.response?.data?.message || 'No se pudo crear la recompensa') })
  const toggle = useMutation({ mutationFn: async id => { await auth(); return api.patch(`/api/v1/admin-marketing/rewards/${id}/toggle`) }, onSuccess: () => { toast.success('Estado actualizado'); invalidate() }, onError: err => toast.error(err?.response?.data?.message || 'No se pudo actualizar') })
  const remove = useMutation({ mutationFn: async id => { await auth(); return api.delete(`/api/v1/admin-marketing/rewards/${id}`) }, onSuccess: () => { toast.success('Recompensa eliminada'); invalidate() }, onError: err => toast.error(err?.response?.data?.message || 'No se pudo eliminar') })
  return { create, toggle, remove }
}

export function useMarketingAdmins(period = 'month', date) {
  return useAuthenticatedQuery('marketing-admins', '/api/v1/admin/marketing-admins', { period, date })
}

export function useMarketingAdminInviteMutations() {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['marketing-admins'] })
  const withToken = async fn => {
    const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })
    setAuthToken(token)
    return fn()
  }
  const create = useMutation({
    mutationFn: () => withToken(() => api.post('/api/v1/admin/marketing-admins/link')),
    onSuccess: () => { toast.success('Enlace de registro creado'); invalidate() },
    onError: err => toast.error(err?.response?.data?.message || (err?.response?.status === 500 ? 'No se pudo crear el enlace. Verifica que el backend y las migraciones estén actualizados.' : 'No se pudo crear el enlace')),
  })
  const refreshLink = useMutation({
    mutationFn: id => withToken(() => api.post(`/api/v1/admin/marketing-admins/${id}/link`)),
    onSuccess: () => { toast.success('Enlace de registro renovado'); invalidate() },
    onError: err => toast.error(err?.response?.data?.message || (err?.response?.status === 500 ? 'No se pudo renovar el enlace. Verifica que el backend y las migraciones estén actualizados.' : 'No se pudo renovar el enlace')),
  })
  const approve = useMutation({
    mutationFn: id => withToken(() => api.patch(`/api/v1/admin/marketing-admins/${id}/approve`)),
    onSuccess: () => { toast.success('Acceso de marketing aprobado'); invalidate() },
    onError: err => toast.error(err?.response?.data?.message || 'No se pudo aprobar la cuenta'),
  })
  const suspend = useMutation({
    mutationFn: id => withToken(() => api.patch(`/api/v1/admin/marketing-admins/${id}/suspend`)),
    onSuccess: () => { toast.success('Acceso de marketing suspendido'); invalidate() },
    onError: err => toast.error(err?.response?.data?.message || 'No se pudo suspender la cuenta'),
  })
  return { create, refreshLink, approve, suspend }
}

export function useTechAdmins(period = 'month', date) { return useAuthenticatedQuery('tech-admins', '/api/v1/admin/tech-admins', { period, date }) }
export function useTechAdminInviteMutations() {
  const { getAccessTokenSilently } = useAuth0(); const qc = useQueryClient(); const invalidate = () => qc.invalidateQueries({ queryKey: ['tech-admins'] })
  const withToken = async fn => { const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }); setAuthToken(token); return fn() }
  const mutation = (method, baseUrl, message) => useMutation({ mutationFn: value => withToken(() => { const url = value ? `${baseUrl}/${value}` : baseUrl; return method === 'post' ? api.post(url) : api.patch(url) }), onSuccess: () => { toast.success(message); invalidate() }, onError: err => toast.error(err?.response?.data?.message || 'No se pudo actualizar la invitación') })
  return { create: mutation('post', '/api/v1/admin/tech-admins/link', 'Enlace técnico creado'), refreshLink: mutation('post', '/api/v1/admin/tech-admins', 'Enlace técnico renovado'), approve: mutation('patch', '/api/v1/admin/tech-admins', 'Acceso técnico aprobado'), suspend: mutation('patch', '/api/v1/admin/tech-admins', 'Acceso técnico suspendido') }
}

export function useFinanceAdmins(period = 'month', date) { return useAuthenticatedQuery('finance-admins', '/api/v1/admin/finance-admins', { period, date }) }
export function useFinanceAdminInviteMutations() {
  const { getAccessTokenSilently } = useAuth0(); const qc = useQueryClient(); const invalidate = () => qc.invalidateQueries({ queryKey: ['finance-admins'] })
  const withToken = async fn => { const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }); setAuthToken(token); return fn() }
  const mutation = (method, url, message) => useMutation({ mutationFn: value => withToken(() => method === 'post' ? api.post(value ? `${url}/${value}` : url) : api.patch(`${url}/${value}`)), onSuccess: () => { toast.success(message); invalidate() }, onError: err => toast.error(err?.response?.data?.message || 'No se pudo actualizar la invitación financiera') })
  return { create: mutation('post', '/api/v1/admin/finance-admins/link', 'Enlace financiero creado'), refreshLink: mutation('post', '/api/v1/admin/finance-admins', 'Enlace financiero renovado'), approve: mutation('patch', '/api/v1/admin/finance-admins', 'Acceso financiero aprobado'), suspend: mutation('patch', '/api/v1/admin/finance-admins', 'Acceso financiero suspendido') }
}

export function useFinanceDashboard(period = 'month') {
  return useAuthenticatedQuery('finance-dashboard', '/api/v1/admin-finance/dashboard', { period }, { refetchInterval: 15000 })
}

export function useFinanceWithdrawalMutations() {
  const { getAccessTokenSilently } = useAuth0(); const qc = useQueryClient()
  const auth = async () => { const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }); setAuthToken(token) }
  const accept = useMutation({ mutationFn: async id => { await auth(); return api.patch(`/api/v1/admin-finance/withdrawals/${id}/accept`) }, onSuccess: () => { toast.success('Solicitud aceptada para pago'); qc.invalidateQueries({ queryKey: ['finance-dashboard'] }) }, onError: err => toast.error(err?.response?.data?.message || 'No se pudo aceptar la solicitud') })
  const pay = useMutation({ mutationFn: async ({ id, transferReference }) => { await auth(); return api.patch(`/api/v1/admin-finance/withdrawals/${id}/paid`, { transferReference }) }, onSuccess: () => { toast.success('Pago registrado correctamente'); qc.invalidateQueries({ queryKey: ['finance-dashboard'] }) }, onError: err => toast.error(err?.response?.data?.message || 'No se pudo registrar el pago') })
  return { accept, pay }
}

export function useMarketingPayoutMutation() {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, transferReference }) => {
      const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })
      setAuthToken(token)
      return api.patch(`/api/v1/admin-marketing/settlements/withdrawals/${id}/paid`, { transferReference })
    },
    onSuccess: () => { toast.success('Retiro marcado como transferido'); qc.invalidateQueries({ queryKey: ['marketing-settlements'] }) },
    onError: err => toast.error(err?.response?.data?.message || 'No se pudo actualizar el retiro'),
  })
}

export function useMarketingCreditRestaurant() {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async id => {
      const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })
      setAuthToken(token)
      return api.post(`/api/v1/admin-marketing/settlements/restaurants/${id}/credit`)
    },
    onSuccess: () => {
      toast.success('Saldo acreditado al restaurante')
      qc.invalidateQueries({ queryKey: ['marketing-settlements'] })
      qc.invalidateQueries({ queryKey: ['marketing-analytics'] })
    },
    onError: err => toast.error(err?.response?.data?.message || 'No se pudo acreditar el saldo'),
  })
}

export function useAdminDrivers(params = {}) {
  return useAuthenticatedQuery('admin-drivers', '/api/v1/admin/drivers', params)
}

// ── Mutaciones ────────────────────────────────────────────────
export function useAdminMutations() {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()

  // Invalida TODAS las queries de admin: cubre tanto las que usan
  // key ['admin', 'metrics'] como las que usan ['admin-restaurants', params],
  // ['admin-users', params], etc. invalidateQueries({queryKey:['admin']})
  // NO las alcanzaba porque 'admin' !== 'admin-restaurants' como string.
  const invalidate = () => qc.invalidateQueries({
    predicate: (query) => String(query.queryKey[0]).startsWith('admin'),
  })

  const withToken = async (fn) => {
    const token = await getAccessTokenSilently({
      authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
    })
    setAuthToken(token)
    return fn()
  }

  const verifyRestaurant = useMutation({
    mutationFn: (id) => withToken(() => api.patch(`/api/v1/admin/restaurants/${id}/verify`)),
    onSuccess: () => { toast.success('Restaurante verificado'); invalidate() },
    onError:   (err) => toast.error(err?.response?.data?.message || 'Error al verificar restaurante'),
  })

  const suspendRestaurant = useMutation({
    mutationFn: (id) => withToken(() => api.patch(`/api/v1/admin/restaurants/${id}/suspend`)),
    onSuccess: () => { toast.success('Restaurante suspendido'); invalidate() },
    onError:   (err) => toast.error(err?.response?.data?.message || 'Error al suspender restaurante'),
  })

  const toggleUser = useMutation({
    mutationFn: (id) => withToken(() => api.patch(`/api/v1/admin/users/${id}/toggle`)),
    onSuccess: () => { toast.success('Usuario actualizado'); invalidate() },
    onError:   (err) => toast.error(err?.response?.data?.message || 'Error al actualizar usuario'),
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }) => withToken(() => api.patch(`/api/v1/admin/users/${id}/role`, { role })),
    onSuccess: () => { toast.success('Rol actualizado'); invalidate() },
    onError:   (err) => toast.error(err?.response?.data?.message || 'Error al cambiar rol'),
  })

  const verifyDriver = useMutation({
    mutationFn: (id) => withToken(() => api.patch(`/api/v1/admin/drivers/${id}/verify`)),
    onSuccess: () => { toast.success('Repartidor verificado'); invalidate() },
    onError:   (err) => toast.error(err?.response?.data?.message || 'Error al verificar repartidor'),
  })

  const suspendDriver = useMutation({
    mutationFn: (id) => withToken(() => api.patch(`/api/v1/admin/drivers/${id}/suspend`)),
    onSuccess: () => { toast.success('Repartidor suspendido'); invalidate() },
    onError:   (err) => toast.error(err?.response?.data?.message || 'Error al suspender repartidor'),
  })

  const activateDriver = useMutation({
    mutationFn: (id) => withToken(() => api.patch(`/api/v1/admin/drivers/${id}/activate`)),
    onSuccess: () => { toast.success('Repartidor activado'); invalidate() },
    onError:   (err) => toast.error(err?.response?.data?.message || 'Error al activar repartidor'),
  })

  const updateCommission = useMutation({
    mutationFn: (commissionPercent) => withToken(() => api.patch('/api/v1/admin/settlements/commission', { commissionPercent })),
    onSuccess: () => { toast.success('Porcentaje de comisión actualizado'); invalidate() },
    onError: (err) => toast.error(err?.response?.data?.message || 'No se pudo actualizar la comisión'),
  })

  const creditRestaurant = useMutation({
    mutationFn: (id) => withToken(() => api.post(`/api/v1/admin/settlements/restaurants/${id}/credit`)),
    onSuccess: () => { toast.success('Saldo acreditado al restaurante'); invalidate() },
    onError: (err) => toast.error(err?.response?.data?.message || 'No se pudo acreditar el saldo'),
  })

  const markWithdrawalPaid = useMutation({
    mutationFn: ({ id, transferReference }) => withToken(() => api.patch(`/api/v1/admin/settlements/withdrawals/${id}/paid`, { transferReference })),
    onSuccess: () => { toast.success('Retiro marcado como transferido'); invalidate() },
    onError: (err) => toast.error(err?.response?.data?.message || 'No se pudo actualizar el retiro'),
  })

  return { verifyRestaurant, suspendRestaurant, toggleUser, changeRole, verifyDriver, suspendDriver, activateDriver, updateCommission, creditRestaurant, markWithdrawalPaid }
}
