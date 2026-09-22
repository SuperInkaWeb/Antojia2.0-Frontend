import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { api, setAuthToken } from '../config/api.js'

export function useMyOrders(params = {}) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()

  return useQuery({
    queryKey: ['my-orders', params],
    queryFn: async () => {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
      setAuthToken(token)
      const { data } = await api.get('/api/v1/orders/my', { params })
      return data
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // refresca cada 30s para actualizar estados en tiempo real
    staleTime: 0,
  })
}

export function useOrderDetail(id) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()

  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
      setAuthToken(token)
      const { data } = await api.get(`/api/v1/orders/${id}`)
      return data.data
    },
    enabled: isAuthenticated && !!id,
    refetchInterval: query => ['DELIVERED', 'CANCELLED'].includes(query.state.data?.status) ? false : 30000,
    staleTime: 0,
  })
}

export function useRateDriver() {
  const { getAccessTokenSilently } = useAuth0()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, score }) => {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      })
      setAuthToken(token)
      const { data } = await api.post(`/api/v1/orders/${orderId}/driver-rating`, { score })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      queryClient.invalidateQueries({ queryKey: ['order'] })
    },
  })
}
