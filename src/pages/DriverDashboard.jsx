import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Package, ChevronRight, Loader2, Navigation, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi.js'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import { api, setAuthToken } from '../config/api.js'
import Navbar from '../components/layout/Navbar.jsx'
import DeliveryProofCapture from '../components/delivery/DeliveryProofCapture.jsx'
import './DriverDashboard.css'

const DISTRICTS = ['Miraflores','San Isidro','Barranco','Surco','La Molina','San Borja','Cercado de Lima','Lince','Jesús María','Magdalena','San Miguel','Pueblo Libre','Breña','Rímac','Los Olivos','San Martín de Porres','Ate','La Victoria','Chorrillos']

export default function DriverDashboard() {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0(); useApi()
  const qc = useQueryClient()
  const { data: profile } = useCurrentUser()
  const [district, setDistrict] = useState('ALL'), [busy, setBusy] = useState(null), [statusBusy, setStatusBusy] = useState(false)
  const [deliveryCode, setDeliveryCode] = useState(''), [proofUrl, setProofUrl] = useState('')
  // Cada cuenta necesita su propia caché: al cambiar de repartidor no deben
  // reutilizarse los pedidos activos ni la lista del repartidor anterior.
  const driverKey = user?.sub
  const activeOrdersKey = ['driver-active-orders', driverKey]
  const availableOrdersKey = ['driver-orders', driverKey]
  const auth = async () => setAuthToken(await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } }))
  const driver = profile?.driverProfile
  const { data: active = [] } = useQuery({ queryKey: activeOrdersKey, queryFn: async () => { await auth(); return (await api.get('/api/v1/drivers/orders/active')).data.data }, enabled: isAuthenticated && Boolean(driverKey), refetchInterval: 20000 })
  // La bolsa de pedidos es global: todos los repartidores ven todos los READY
  // sin repartidor, sin limitarla al distrito de su perfil.
  const { data: orders = [], isLoading, refetch } = useQuery({ queryKey: availableOrdersKey, queryFn: async () => { await auth(); return (await api.get('/api/v1/drivers/orders/available')).data.data }, enabled: isAuthenticated && Boolean(driverKey) && !active.length, refetchInterval: active.length ? false : 30000 })
  const filteredOrders = district === 'ALL'
    ? orders
    : orders.filter(order => order.restaurant?.district?.toLocaleLowerCase() === district.toLocaleLowerCase())

  const accept = async order => {
    const destination = order.restaurant?.latitude != null && order.restaurant?.longitude != null ? `${order.restaurant.latitude},${order.restaurant.longitude}` : encodeURIComponent(`${order.restaurant?.address || ''}, ${order.restaurant?.district || ''}, Perú`)
    const routeWindow = window.open('about:blank', '_blank'); setBusy(order.id)
    try {
      await auth(); await api.patch(`/api/v1/orders/${order.id}/assign-driver`)
      if (routeWindow) routeWindow.location.href = `https://www.google.com/maps/dir/?api=1&destination=${destination}`
      toast.success('Pedido tomado. Sigue la ruta hacia el restaurante.')
      await qc.invalidateQueries({ queryKey: activeOrdersKey }); await qc.invalidateQueries({ queryKey: availableOrdersKey }); refetch()
    } catch (error) { routeWindow?.close(); toast.error(error.response?.data?.message || 'No se pudo tomar el pedido') }
    finally { setBusy(null) }
  }

  const toggleAvailability = async () => {
    const nextStatus = driver?.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'
    setStatusBusy(true)
    try {
      await auth()
      await api.patch('/api/v1/drivers/status', { status: nextStatus })
      await qc.invalidateQueries({ queryKey: ['current-user'] })
      toast.success(nextStatus === 'AVAILABLE' ? 'Ya estás disponible para tomar pedidos' : 'Ahora estás desconectado')
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar tu disponibilidad')
    } finally {
      setStatusBusy(false)
    }
  }

  const advance = async order => {
    const status = order.status === 'READY' ? 'ON_THE_WAY' : 'DELIVERED'
    if (status === 'DELIVERED' && (!/^\d{6}$/.test(deliveryCode) || !proofUrl)) return toast.error('Ingresa el código de 6 dígitos y toma la foto de entrega')
    setBusy(order.id)
    try {
      await auth()
      const { data } = await api.patch(`/api/v1/orders/${order.id}/status`, { status, ...(status === 'DELIVERED' && { deliveryCode, deliveryProofUrl: proofUrl }) })
      if (status === 'ON_THE_WAY' && data.data) qc.setQueryData(activeOrdersKey, currentOrders => (currentOrders || []).map(item => item.id === order.id ? data.data : item))
      toast.success(status === 'ON_THE_WAY' ? 'Entrega en camino. La ruta ahora apunta al cliente.' : 'Entrega completada'); setDeliveryCode(''); setProofUrl(''); qc.invalidateQueries({ queryKey: activeOrdersKey })
    } catch (error) { toast.error(error.response?.data?.message || 'No se pudo actualizar') }
    finally { setBusy(null) }
  }

  const current = active[0]
  const currentDestination = current?.status === 'READY'
    ? (current.restaurant?.latitude != null && current.restaurant?.longitude != null
      ? `${current.restaurant.latitude},${current.restaurant.longitude}`
      : encodeURIComponent(`${current.restaurant?.address || ''}, ${current.restaurant?.district || ''}, Perú`))
    : (current?.deliveryLatitude != null && current?.deliveryLongitude != null
      ? `${current.deliveryLatitude},${current.deliveryLongitude}`
      : encodeURIComponent(`${current?.deliveryAddress || ''}, ${current?.deliveryDistrict || ''}, Perú`))
  return <div className="ddash"><Navbar/><div className="ddash-inner"><h1 className="ddash-title">Panel de repartidor</h1>
    {driver && <section className="ddash-availability">
      <div>
        <strong>{driver.isVerified ? (driver.status === 'AVAILABLE' ? 'Estás disponible' : 'Estás desconectado') : 'Perfil pendiente de verificación'}</strong>
        <p>{driver.isVerified ? 'Activa tu disponibilidad para poder tomar pedidos.' : 'Un administrador debe verificar tu perfil antes de tomar pedidos.'}</p>
      </div>
      <button
        className="dorder-accept"
        onClick={toggleAvailability}
        disabled={!driver.isVerified || statusBusy || Boolean(active.length)}
      >
        {statusBusy ? 'Actualizando…' : driver.status === 'AVAILABLE' ? 'Desconectarme' : 'Ponerme disponible'}
      </button>
    </section>}
    {current ? <section className="ddash-active">
      <div className="ddash-active-head"><div><span className="ddash-live">● ENTREGA ACTIVA</span><h2>#{current.orderNumber?.slice(-8)}</h2></div><strong>S/ {current.total?.toFixed(2)}</strong></div>
      <p><Package size={15}/> Recoger en <strong>{current.restaurant?.name}</strong>: {current.restaurant?.address}</p>
      {current.restaurant?.addressReference && <p><MapPin size={15}/> Referencia del restaurante: <strong>{current.restaurant.addressReference}</strong></p>}
      <p><MapPin size={15}/> Entregar a <strong>{current.user?.name}</strong>: {current.deliveryAddress}</p>
      {current.status === 'ON_THE_WAY' && <div className="ddash-proof"><h3>Validar entrega</h3><p>Pide al cliente su código de 6 dígitos y toma la foto al entregar.</p><input className="ddash-code-input" inputMode="numeric" maxLength={6} placeholder="Código de entrega" value={deliveryCode} onChange={event => setDeliveryCode(event.target.value.replace(/\D/g, '').slice(0, 6))}/><DeliveryProofCapture orderId={current.id} value={proofUrl} onUploaded={setProofUrl}/></div>}
      <div className="ddash-active-actions"><a className="ddash-route" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${currentDestination}`}><Navigation size={16}/> {current.status === 'READY' ? 'Abrir ruta al restaurante' : 'Entregar pedido al cliente'}</a><button className="dorder-accept" disabled={busy === current.id || current.status === 'ON_THE_WAY' && (!/^\d{6}$/.test(deliveryCode) || !proofUrl)} onClick={() => advance(current)}>{busy === current.id ? <Loader2 size={15} className="ddash-spinner"/> : <CheckCircle size={15}/>} {current.status === 'READY' ? 'Ya recogí el pedido' : 'Confirmar entrega'}</button></div>
      <small className="ddash-tracking">ID de delivery: {current.id}</small>
    </section> : <><div className="ddash-zone"><h2 className="ddash-zone-title"><MapPin size={18}/> Filtrar por distrito de recojo</h2><select className="ddash-select" value={district} onChange={event => setDistrict(event.target.value)}><option value="ALL">Todos los distritos</option>{DISTRICTS.map(item => <option key={item}>{item}</option>)}</select></div>
      {isLoading && <div className="ddash-loading"><Loader2 className="ddash-spinner"/></div>}
      <div className="ddash-orders">{filteredOrders.map(order => <div className="dorder" key={order.id}><div className="dorder-header"><div><p className="dorder-number">#{order.orderNumber?.slice(-8)}</p><p className="dorder-restaurant">{order.restaurant?.name} · {order.restaurant?.address}, {order.restaurant?.district}</p>{order.restaurant?.addressReference && <p className="dorder-restaurant">Referencia: {order.restaurant.addressReference}</p>}</div></div><div className="dorder-delivery"><MapPin size={13}/> Entrega en {order.deliveryAddress}, {order.deliveryDistrict}</div><div className="dorder-footer"><b>S/ {order.total?.toFixed(2)}</b><button className="dorder-accept" onClick={() => accept(order)} disabled={busy === order.id}>{busy === order.id ? <Loader2 className="ddash-spinner" size={14}/> : <ChevronRight size={14}/>} Tomar pedido</button></div></div>)}</div>
      {!isLoading && !filteredOrders.length && <div className="ddash-empty"><p>No hay pedidos listos para recoger {district === 'ALL' ? 'ahora mismo' : `en ${district}`}</p></div>}</>}
  </div></div>
}
