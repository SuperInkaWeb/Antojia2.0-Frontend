import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Clock, Calendar, Bike, User, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/layout/Navbar.jsx'
import OrderStatusBadge, { OrderProgressBar } from '../components/orders/OrderStatusBadge.jsx'
import { useOrderDetail } from '../hooks/useOrders.js'
import { useApi } from '../hooks/useApi.js'
import { useCartStore } from '../store/cartStore.js'
import './OrderDetail.css'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'

export default function OrderDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const api       = useApi()
  const { data: order, isLoading, isError, isFetching, refetch } = useOrderDetail(id)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const removePurchasedItems = useCartStore(state => state.removePurchasedItems)

  useEffect(() => {
    if (order?.payment?.status !== 'PAID') return

    const key = `antojia-pending-payment-${order.id}`
    try {
      const storedItems = JSON.parse(localStorage.getItem(key) || 'null')
      if (Array.isArray(storedItems)) removePurchasedItems(storedItems)
      localStorage.removeItem(key)
    } catch {
      localStorage.removeItem(key)
    }
  }, [removePurchasedItems, order?.id, order?.items, order?.payment?.status])

  const handleCheckPayment = async () => {
    setCheckingPayment(true)
    try {
      const { data } = await api.post('/api/v1/payments/mercadopago/sync', { orderId: id })
      if (data.data?.status === 'PAID') {
        const purchasedItems = (order?.items || []).map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
        removePurchasedItems(purchasedItems)
        toast.success('¡Pago confirmado! 🎉')
      } else if (data.data?.status === 'PENDING') {
        toast('Mercado Pago todavía no confirma el pago. Intenta de nuevo en unos segundos.')
      } else {
        toast.error('El pago no se pudo confirmar')
      }
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'No se pudo verificar el pago')
    } finally {
      setCheckingPayment(false)
    }
  }

  if (isLoading) return (
    <div className="odetail">
      <Navbar />
      <div className="odetail-skeleton-wrap">
        {[1,2,3,4].map(i => <div key={i} className="odetail-skeleton" />)}
      </div>
    </div>
  )

  if (isError || !order) return (
    <div className="odetail">
      <Navbar />
      <div className="odetail-error">
        <p>😕 No pudimos cargar el pedido</p>
        <button onClick={() => navigate('/orders')}>Volver a mis pedidos</button>
      </div>
    </div>
  )

  const date = new Date(order.createdAt).toLocaleDateString('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  const time = new Date(order.createdAt).toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="odetail">
      <Navbar />
      <div className="odetail-inner">

        {/* Botón volver */}
        <button className="odetail-back" onClick={() => navigate('/orders')}>
          <ArrowLeft size={16} /> Mis pedidos
        </button>

        {/* Header */}
        <div className="odetail-header">
          <div className="odetail-header-copy">
            <span className="odetail-kicker">
              {order.type === 'DELIVERY' ? '🛵 Pedido por delivery' : '🍽️ Reserva en restaurante'}
            </span>
            <p className="odetail-number">Pedido #{order.orderNumber?.slice(-8)}</p>
            <p className="odetail-date">{date} · {time}</p>
          </div>
          <div className="odetail-header-actions">
            <button
              type="button"
              className="odetail-refresh-btn"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Actualizar estado del pedido"
            >
              <RefreshCw size={15} className={isFetching ? 'odetail-spin' : ''} />
              {isFetching ? 'Actualizando…' : 'Actualizar'}
            </button>
            <OrderStatusBadge status={order.status} size="md" />
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="odetail-card odetail-card--progress">
          <h2 className="odetail-card-title">Estado del pedido</h2>
          <OrderProgressBar status={order.status} type={order.type} />
        </div>

        {/* Info según tipo */}
        {order.type === 'DELIVERY' && (
          <div className="odetail-card">
            <h2 className="odetail-card-title">
              <Bike size={16} /> Información de entrega
            </h2>
            <div className="odetail-info-rows">
              <div className="odetail-info-row">
                <MapPin size={15} className="odetail-icon" />
                <div>
                  <p className="odetail-info-label">Dirección</p>
                  <p className="odetail-info-value">{order.deliveryAddress}</p>
                  {order.deliveryDistrict && <p className="odetail-info-sub">{order.deliveryDistrict}</p>}
                </div>
              </div>
              {order.deliveryPhone && (
                <div className="odetail-info-row">
                  <Phone size={15} className="odetail-icon" />
                  <div>
                    <p className="odetail-info-label">Teléfono de contacto</p>
                    <p className="odetail-info-value">{order.deliveryPhone}</p>
                  </div>
                </div>
              )}
              {order.deliveryNotes && (
                <div className="odetail-info-row">
                  <Clock size={15} className="odetail-icon" />
                  <div>
                    <p className="odetail-info-label">Referencia</p>
                    <p className="odetail-info-value">{order.deliveryNotes}</p>
                  </div>
                </div>
              )}
              <div className="odetail-info-row">
                <Bike size={15} className="odetail-icon" />
                <div>
                  <p className="odetail-info-label">Delivery asignado</p>
                  {order.driver ? <>
                    <p className="odetail-info-value">{order.driver.user?.name || 'Repartidor'}</p>
                    {order.driver.user?.phone && <p className="odetail-info-sub">Teléfono: {order.driver.user.phone}</p>}
                    {order.driver.licensePlate && <p className="odetail-info-sub">Placa: {order.driver.licensePlate}</p>}
                  </> : <>
                    <p className="odetail-info-value">Aún sin repartidor</p>
                    <p className="odetail-info-sub">{order.status === 'READY' ? 'Buscando un delivery disponible…' : 'Se buscará un delivery cuando el restaurante marque el pedido como listo.'}</p>
                  </>}
                </div>
              </div>
            </div>
          </div>
        )}

        {order.type === 'RESERVATION' && (
          <div className="odetail-card">
            <h2 className="odetail-card-title">
              <Calendar size={16} /> Información de reserva
            </h2>
            <div className="odetail-info-rows">
              <div className="odetail-info-row">
                <Calendar size={15} className="odetail-icon" />
                <div>
                  <p className="odetail-info-label">Fecha y hora</p>
                  <p className="odetail-info-value">
                    {new Date(order.reservationDate).toLocaleDateString('es-PE', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })} a las {order.reservationTime}
                  </p>
                </div>
              </div>
              <div className="odetail-info-row">
                <User size={15} className="odetail-icon" />
                <div>
                  <p className="odetail-info-label">Personas</p>
                  <p className="odetail-info-value">{order.partySize} {order.partySize === 1 ? 'persona' : 'personas'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurante */}
        <div className="odetail-card odetail-card--restaurant">
          <h2 className="odetail-card-title">Restaurante</h2>
          <div className="odetail-info-rows">
            <div className="odetail-info-row">
              <div className="odetail-restaurant-avatar">
                {order.restaurant?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="odetail-restaurant-name">{order.restaurant?.name}</p>
                <p className="odetail-info-sub"><MapPin size={13} /> {order.restaurant?.address}</p>
              </div>
            </div>
            {order.restaurant?.phone && (
              <div className="odetail-info-row">
                <Phone size={15} className="odetail-icon" />
                <p className="odetail-info-value">{order.restaurant.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Repartidor asignado */}
        {order.driver && (
          <div className="odetail-card odetail-card--driver">
            <h2 className="odetail-card-title">
              <Bike size={16} /> Tu repartidor
            </h2>
            <div className="odetail-driver">
              <div className="odetail-driver-avatar">
                {order.driver.user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="odetail-driver-name">{order.driver.user?.name}</p>
                {order.driver.user?.phone && (
                  <p className="odetail-driver-phone">📞 {order.driver.user.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {order.type === 'DELIVERY' && order.deliveryCode && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
          <div className="odetail-card odetail-delivery-code">
            <h2 className="odetail-card-title">Código secreto de entrega</h2>
            <strong>{order.deliveryCode}</strong>
            <p>Dáselo al repartidor únicamente cuando tengas tu pedido en las manos.</p>
          </div>
        )}

        {order.deliveryProofUrl && (
          <div className="odetail-card">
            <h2 className="odetail-card-title">Comprobante de entrega</h2>
            <a href={order.deliveryProofUrl} target="_blank" rel="noreferrer">
              <img className="odetail-proof-image" src={order.deliveryProofUrl} alt="Fotografía de la entrega"/>
            </a>
          </div>
        )}

        {/* Productos */}
        <div className="odetail-card">
          <h2 className="odetail-card-title">Productos</h2>
          <div className="odetail-items">
            {order.items?.map(item => (
              <div key={item.id} className="odetail-item">
                <img
                  src={item.product?.imageUrl || PLACEHOLDER}
                  alt={item.product?.name}
                  onError={e => { e.target.src = PLACEHOLDER }}
                />
                <div className="odetail-item-info">
                  <p className="odetail-item-name">{item.product?.name}</p>
                  <p className="odetail-item-qty">{item.quantity} × S/ {item.unitPrice?.toFixed(2)}</p>
                </div>
                <span className="odetail-item-subtotal">
                  S/ {item.subtotal?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="odetail-totals">
            <div className="odetail-total-row">
              <span>Subtotal</span>
              <span>S/ {order.subtotal?.toFixed(2)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="odetail-total-row">
                <span>Delivery</span>
                <span>S/ {order.deliveryFee?.toFixed(2)}</span>
              </div>
            )}
            {order.discountAmount > 0 && (
              <div className="odetail-total-row odetail-total-row--discount">
                <span>Descuento</span>
                <span>- S/ {order.discountAmount?.toFixed(2)}</span>
              </div>
            )}
            <div className="odetail-total-row odetail-total-row--total">
              <span>Total</span>
              <span>S/ {order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Pago */}
        {order.payment && (
          <div className="odetail-card">
            <h2 className="odetail-card-title">Pago</h2>
            <div className="odetail-info-rows">
              <div className="odetail-info-row">
                <div>
                  <p className="odetail-info-label">Método</p>
                  <p className="odetail-info-value">
                    {order.payment.method === 'MERCADOPAGO'       ? '💳 Mercado Pago'    :
                     order.payment.method === 'YAPE'             ? '📱 Yape'            :
                     order.payment.method === 'CASH_ON_DELIVERY' ? '💵 Efectivo'        : order.payment.method}
                  </p>
                </div>
                <div>
                  <p className="odetail-info-label">Estado</p>
                  <p className="odetail-info-value" style={{
                    color: order.payment.status === 'PAID' ? '#16a34a' : '#b45309',
                    fontWeight: 700,
                  }}>
                    {order.payment.status === 'PAID'    ? '✅ Pagado'   :
                     order.payment.status === 'PENDING' ? '⏳ Pendiente' :
                     order.payment.status === 'FAILED'  ? '❌ Fallido'  : order.payment.status}
                  </p>
                </div>
              </div>
            </div>

            {order.payment.method === 'MERCADOPAGO' && order.payment.status === 'PENDING' && (
              <button
                className="odetail-check-payment-btn"
                onClick={handleCheckPayment}
                disabled={checkingPayment}
              >
                <RefreshCw size={16} className={checkingPayment ? 'odetail-spin' : ''} />
                {checkingPayment ? 'Verificando...' : 'Verificar pago'}
              </button>
            )}
          </div>
        )}

        {/* Notas */}
        {order.notes && (
          <div className="odetail-card">
            <h2 className="odetail-card-title">Notas del pedido</h2>
            <p className="odetail-notes">{order.notes}</p>
          </div>
        )}

      </div>
    </div>
  )
}
