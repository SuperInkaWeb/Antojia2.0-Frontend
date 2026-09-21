import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth0 } from '@auth0/auth0-react'
import { api, setAuthToken } from '../config/api.js'
import toast from 'react-hot-toast'

async function withAuth(getAccessTokenSilently) {
  const token = await getAccessTokenSilently({
    authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
  })
  setAuthToken(token)
}
// ── Actualizar nombre/teléfono ─────────────────────────────────
export function useUpdateProfile() {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.patch('/api/v1/auth/me', data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Perfil actualizado')
      qc.invalidateQueries({ queryKey: ['current-user'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Error al actualizar perfil'),
  })
}

// ── Actualizar restaurante ─────────────────────────────────────
export function useUpdateRestaurant(restaurantId) {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.put(`/api/v1/restaurants/${restaurantId}`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Restaurante actualizado')
      qc.invalidateQueries({ queryKey: ['current-user'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Error al actualizar restaurante'),
  })
}

// ── Productos del restaurante ──────────────────────────────────
export function useRestaurantProducts(restaurantId) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  return useQuery({
    queryKey: ['restaurant-products', restaurantId],
    queryFn: async () => {
      await withAuth(getAccessTokenSilently)
      const res = await api.get(`/api/v1/products/restaurant/${restaurantId}`)
      return res.data.data || []
    },
    enabled: isAuthenticated && !!restaurantId,
  })
}

// ── Categorías del menú ────────────────────────────────────────
export function useRestaurantCategories(restaurantId) {
  return useQuery({
    queryKey: ['restaurant-categories', restaurantId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/restaurants/${restaurantId}/categories`)
      return res.data.data || []
    },
    enabled: !!restaurantId,
  })
}

export function useCreateCategory(restaurantId) {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.post(`/api/v1/restaurants/${restaurantId}/categories`, { name })
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-categories', restaurantId] })
      qc.invalidateQueries({ queryKey: ['restaurant', restaurantId] })
      toast.success('Categoría creada')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'No se pudo crear la categoría'),
  })
}

// ── Crear producto ─────────────────────────────────────────────
export function useCreateProduct(restaurantId) {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.post(`/api/v1/products/restaurant/${restaurantId}`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Producto añadido al menú')
      qc.invalidateQueries({ queryKey: ['restaurant-products', restaurantId] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Error al crear producto'),
  })
}

// ── Editar producto ────────────────────────────────────────────
export function useUpdateProduct(restaurantId) {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.put(`/api/v1/products/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      toast.success('Producto actualizado')
      qc.invalidateQueries({ queryKey: ['restaurant-products', restaurantId] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Error al actualizar producto'),
  })
}

// ── Eliminar producto ──────────────────────────────────────────
export function useDeleteProduct(restaurantId) {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      await withAuth(getAccessTokenSilently)
      await api.delete(`/api/v1/products/${id}`)
    },
    onSuccess: () => {
      toast.success('Producto eliminado')
      qc.invalidateQueries({ queryKey: ['restaurant-products', restaurantId] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Error al eliminar producto'),
  })
}

// ── Toggle disponibilidad ──────────────────────────────────────
export function useToggleProduct(restaurantId) {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isAvailable }) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.patch(`/api/v1/products/${id}/availability`, { isAvailable })
      return res.data
    },
    onMutate: async ({ id, isAvailable }) => {
      const queryKey = ['restaurant-products', restaurantId]
      await qc.cancelQueries({ queryKey })
      const previous = qc.getQueryData(queryKey)
      qc.setQueryData(queryKey, (products = []) => products.map(product => product.id === id
        ? { ...product, isAvailable }
        : product
      ))
      return { previous, queryKey }
    },
    onSuccess: (response, { id, isAvailable }) => {
      const updated = response?.data
      const confirmedAvailability = typeof updated?.isAvailable === 'boolean'
        ? updated.isAvailable
        : isAvailable

      qc.setQueryData(['restaurant-products', restaurantId], (products = []) => products.map(product => product.id === id
        ? { ...product, ...updated, isAvailable: confirmedAvailability }
        : product
      ))
      toast.success(confirmedAvailability ? 'Producto visible para consumidores' : 'Producto oculto para consumidores')
    },
    onError: (err, _id, context) => {
      if (context?.queryKey) qc.setQueryData(context.queryKey, context.previous)
      toast.error(err?.response?.data?.message || 'No se pudo cambiar la visibilidad')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['restaurant', restaurantId] })
      qc.invalidateQueries({ queryKey: ['restaurants'] })
    },
  })
}

export function useApplyProductDiscount(restaurantId) {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, discountPct }) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.patch(`/api/v1/products/${productId}/discount`, { discountPct })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-products', restaurantId] })
      qc.invalidateQueries({ queryKey: ['restaurant', restaurantId] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'No se pudo aplicar la promoción'),
  })
}

// ── Actualizar vehículo del repartidor ─────────────────────────
export function useUpdateDriverVehicle() {
  const { getAccessTokenSilently } = useAuth0()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ vehicleType, licensePlate, accountNumber, dniPhotoUrl, licensePhotoUrl, vehiclePhotoUrl }) => {
      await withAuth(getAccessTokenSilently)
      const res = await api.patch('/api/v1/drivers/vehicle', { vehicleType, licensePlate, accountNumber, dniPhotoUrl, licensePhotoUrl, vehiclePhotoUrl })
      return res.data
    },
    onSuccess: () => {
      toast.success('Datos del repartidor actualizados ✅')
      qc.invalidateQueries({ queryKey: ['current-user'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Error al actualizar vehículo'),
  })
}

