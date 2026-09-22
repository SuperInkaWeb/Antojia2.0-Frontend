import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, ChevronRight, Calendar, Bike, Star, RefreshCw } from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.jsx'
import { useMyOrders, useRateDriver } from '../hooks/useOrders.js'
import './MyOrders.css'

const FILTER_OPTIONS = [
  { value: '',           label: 'Todos' },
  { value: 'PENDING',    label: 'Pendientes' },
  { value: 'CONFIRMED',  label: 'Confirmados' },
  { value: 'PREPARING',  label: 'Preparando' },
  { value: 'READY',      label: 'Listos' },
  { value: 'ON_THE_WAY', label: 'En camino' },
  { value: 'DELIVERED',  label: 'Entregados' },
  { value: 'CANCELLED',  label: 'Cancelados' },
]

function OrderCard({ order, onClick }) {
  const [selectedScore, setSelectedScore] = useState(0)
  const rateDriver = useRateDriver()
  const date     = new Date(order.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  const time     = new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const isActive = !['DELIVERED', 'CANCELLED'].includes(order.status)
  const canRateDriver = order.type === 'DELIVERY' && order.status === 'DELIVERED' && order.driver && !order.driverRating

  const submitRating = async event => {
    event.stopPropagation()
    if (!selectedScore) return
    await rateDriver.mutateAsync({ orderId: order.id, score: selectedScore })
  }

  return (
    <div
      className={`myorder-card ${isActive ? 'myorder-card--active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {isActive && <div className="myorder-live">En curso</div>}

      <div className="myorder-header">
        <div className="myorder-icon">
          {order.type === 'DELIVERY' ? <Bike size={18} /> : <Calendar size={18} />}
        </div>
        <div className="myorder-info">
          <p className="myorder-restaurant">{order.restaurant?.name}</p>
          <p className="myorder-meta">
            #{order.orderNumber?.slice(-8)} · {date} {time}
          </p>
        </div>
        <ChevronRight size={18} className="myorder-arrow" />
      </div>

      <div className="myorder-items">
        {order.items?.slice(0, 3).map(item => (
          <span key={item.id} className="myorder-item">
            {item.quantity}× {item.product?.name}
          </span>
        ))}
        {order.items?.length > 3 && (
          <span className="myorder-item-more">+{order.items.length - 3} más</span>
        )}
      </div>

      <div className="myorder-footer">
        <span className="myorder-total">S/ {order.total?.toFixed(2)}</span>
        <OrderStatusBadge status={order.status} />
      </div>

      {canRateDriver && (
        <div className="myorder-rating" onClick={event => event.stopPropagation()}>
          <p>¿Cómo fue tu delivery con <strong>{order.driver.user?.name || 'tu repartidor'}</strong>?</p>
          <div className="myorder-rating-actions">
            <div className="myorder-stars" aria-label="Calificar repartidor">
              {[1, 2, 3, 4, 5].map(score => <button key={score} type="button" className={score <= selectedScore ? 'selected' : ''} onClick={() => setSelectedScore(score)} aria-label={`${score} estrella${score > 1 ? 's' : ''}`}><Star size={21} fill="currentColor" /></button>)}
            </div>
            <button type="button" className="myorder-rating-submit" disabled={!selectedScore || rateDriver.isPending} onClick={submitRating}>{rateDriver.isPending ? 'Enviando…' : 'Calificar'}</button>
          </div>
          {rateDriver.isError && <small className="myorder-rating-error">{rateDriver.error?.response?.data?.message || 'No se pudo guardar la calificación'}</small>}
        </div>
      )}
      {order.driverRating && <p className="myorder-rated"><Star size={14} fill="currentColor" /> Calificaste a tu repartidor: {order.driverRating.score}/5</p>}
    </div>
  )
}

export default function MyOrders() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [page,         setPage]         = useState(1)

  const { data, isLoading, isFetching, refetch } = useMyOrders({
    status: statusFilter,
    type:   typeFilter,
    page,
    limit:  10,
  })

  const orders     = data?.data || []
  const totalPages = data?.pagination?.totalPages || 1

  const visibleOrders = orders.filter(o => o.payment?.status !== 'FAILED' && !(o.payment?.status === 'PENDING' && o.status === 'PENDING'))
  const active  = visibleOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status))
  const history = visibleOrders.filter(o =>  ['DELIVERED', 'CANCELLED'].includes(o.status))

  return (
    <div className="myorders">
      <Navbar />
      <div className="myorders-inner">
        <h1 className="myorders-title">Mis pedidos</h1>

        <button
          type="button"
          className="myorders-refresh"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Actualizar mis pedidos"
        >
          <RefreshCw size={16} className={isFetching ? 'myorders-refresh-icon--spinning' : ''} />
          {isFetching ? 'Actualizando…' : 'Actualizar pedidos'}
        </button>

        {/* Filtros */}
        <div className="myorders-filters">
          <div className="myorders-filter-group">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`myorders-filter-btn ${statusFilter === opt.value ? 'active' : ''}`}
                onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <select
            className="myorders-type-select"
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          >
            <option value="">Todos los tipos</option>
            <option value="DELIVERY">🛵 Delivery</option>
            <option value="RESERVATION">📅 Reservas</option>
          </select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="myorders-loading">
            {[1,2,3].map(i => <div key={i} className="myorders-skeleton" />)}
          </div>
        )}

        {/* Sin resultados */}
        {!isLoading && orders.length === 0 && (
          <div className="myorders-empty">
            <ShoppingBag size={48} strokeWidth={1.5} />
            <h2>No tienes pedidos aún</h2>
            <p>Cuando hagas un pedido aparecerá aquí</p>
            <button className="myorders-cta" onClick={() => navigate('/')}>
              Explorar restaurantes
            </button>
          </div>
        )}

        {/* Pedidos activos */}
        {!isLoading && active.length > 0 && (
          <section className="myorders-section">
            <h2 className="myorders-section-title">🔴 En curso ({active.length})</h2>
            {active.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => navigate(`/orders/${order.id}`)}
              />
            ))}
          </section>
        )}

        {/* Historial */}
        {!isLoading && history.length > 0 && (
          <section className="myorders-section">
            <h2 className="myorders-section-title">📋 Historial</h2>
            {history.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => navigate(`/orders/${order.id}`)}
              />
            ))}
          </section>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="myorders-pagination">
            <button
              className="myorders-page-btn"
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
            >← Anterior</button>
            <span>Página {page} de {totalPages}</span>
            <button
              className="myorders-page-btn"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  )
}
