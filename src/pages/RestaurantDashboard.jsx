import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, ChevronDown, ChevronUp, RefreshCw,
  Clock, Bike, Calendar, User, MapPin, Phone,
  ShoppingBag, CircleCheck, Flame, PackageCheck,
  Ban, ChevronLeft, ChevronRight,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.jsx'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import { useRestaurantOrders, useUpdateOrderStatus } from '../hooks/useRestaurantOrders.js'
import './RestaurantDashboard.css'

// ── Config de estados ──────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:    { label: 'Pendiente',   icon: <Clock size={14}/>,         color: '#b45309', bg: '#fffbeb' },
  CONFIRMED:  { label: 'Confirmado',  icon: <CircleCheck size={14}/>,   color: '#1d4ed8', bg: '#eff6ff' },
  PREPARING:  { label: 'Preparando', icon: <Flame size={14}/>,          color: '#c2410c', bg: '#fff7ed' },
  READY:      { label: 'Listo',       icon: <PackageCheck size={14}/>,  color: '#15803d', bg: '#f0fdf4' },
  ON_THE_WAY: { label: 'En camino',   icon: <Bike size={14}/>,          color: '#7c3aed', bg: '#f5f3ff' },
  DELIVERED:  { label: 'Entregado',   icon: <CircleCheck size={14}/>,   color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED:  { label: 'Cancelado',   icon: <Ban size={14}/>,           color: '#dc2626', bg: '#fef2f2' },
}

// Transiciones permitidas para RESTAURANT_OWNER
const NEXT_ACTIONS = {
  PENDING:   [{ to: 'CANCELLED', label: 'Cancelar pedido', cls: 'btn-cancel' }],
  CONFIRMED: [{ to: 'CANCELLED', label: 'Cancelar pedido', cls: 'btn-cancel' }],
}

const STATUS_TABS = [
  { value: '',           label: 'Todos' },
  { value: 'ON_THE_WAY', label: 'En camino' },
  { value: 'DELIVERED',  label: 'Entregados' },
  { value: 'CANCELLED',  label: 'Cancelados' },
]

// ── Tarjeta de pedido expandible ──────────────────────────────
function OrderCard({ order, onAction, isUpdating }) {
  const [expanded, setExpanded] = useState(false)
  const cfg   = STATUS_CONFIG[order.status] || {}
  const date  = new Date(order.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  const time  = new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const isNew = order.status === 'PENDING'
  const actions = NEXT_ACTIONS[order.status] || []

  return (
    <div className={`rdb-card ${isNew ? 'rdb-card--new' : ''}`}>
      {isNew && <span className="rdb-card-badge">Nuevo</span>}

      {/* Cabecera siempre visible */}
      <div className="rdb-card-head" onClick={() => setExpanded(e => !e)} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}>
        <div className="rdb-card-left">
          <div className="rdb-card-type-icon">
            {order.type === 'DELIVERY' ? <Bike size={16}/> : <Calendar size={16}/>}
          </div>
          <div>
            <p className="rdb-card-number">#{order.orderNumber?.slice(-8)}</p>
            <p className="rdb-card-meta">{date} · {time}</p>
          </div>
        </div>
        <div className="rdb-card-right">
          <span className="rdb-card-total">S/ {order.total?.toFixed(2)}</span>
          <span className="rdb-card-status-pill" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.icon} {cfg.label}
          </span>
          {expanded ? <ChevronUp size={16} className="rdb-card-chevron"/> : <ChevronDown size={16} className="rdb-card-chevron"/>}
        </div>
      </div>

      {/* Preview de ítems */}
      {!expanded && (
        <div className="rdb-card-items-preview">
          {order.items?.slice(0, 3).map(item => (
            <span key={item.id} className="rdb-item-chip">
              {item.quantity}× {item.product?.name}
            </span>
          ))}
          {order.items?.length > 3 && (
            <span className="rdb-item-chip rdb-item-chip--more">+{order.items.length - 3} más</span>
          )}
        </div>
      )}

      {/* Detalle expandido */}
      {expanded && (
        <div className="rdb-card-detail">
          {/* Cliente */}
          <div className="rdb-detail-section">
            <p className="rdb-detail-label"><User size={13}/> Cliente</p>
            <p className="rdb-detail-val">{order.user?.name || '—'}</p>
            {order.user?.phone && <p className="rdb-detail-sub"><Phone size={11}/> {order.user.phone}</p>}
            <p className="rdb-detail-sub">{order.user?.consumerProfile?.totalOrders ?? 0} pedidos realizados en total</p>
          </div>

          {/* Dirección / Reserva */}
          {order.type === 'DELIVERY' && order.deliveryAddress && (
            <div className="rdb-detail-section">
              <p className="rdb-detail-label"><MapPin size={13}/> Entrega</p>
              <p className="rdb-detail-val">{order.deliveryAddress}</p>
              {order.deliveryDistrict && <p className="rdb-detail-sub">{order.deliveryDistrict}</p>}
              {order.deliveryPhone   && <p className="rdb-detail-sub"><Phone size={11}/> {order.deliveryPhone}</p>}
            </div>
          )}
          {order.type === 'RESERVATION' && (
            <div className="rdb-detail-section">
              <p className="rdb-detail-label"><Calendar size={13}/> Reserva</p>
              <p className="rdb-detail-val">
                {new Date(order.reservationDate).toLocaleDateString('es-PE')} · {order.reservationTime}
              </p>
              <p className="rdb-detail-sub">{order.partySize} personas</p>
            </div>
          )}

          {/* Ítems */}
          <div className="rdb-detail-section">
            <p className="rdb-detail-label"><ShoppingBag size={13}/> Ítems</p>
            <div className="rdb-items-list">
              {order.items?.map(item => (
                <div key={item.id} className="rdb-item-row">
                  <span className="rdb-item-qty">{item.quantity}×</span>
                  <span className="rdb-item-name">{item.product?.name}</span>
                  <span className="rdb-item-price">S/ {item.subtotal?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          {order.notes && (
            <div className="rdb-detail-section">
              <p className="rdb-detail-label">📝 Notas</p>
              <p className="rdb-detail-val rdb-notes">{order.notes}</p>
            </div>
          )}

          {/* Totales */}
          <div className="rdb-totals">
            <div className="rdb-total-row">
              <span>Subtotal</span><span>S/ {order.subtotal?.toFixed(2)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="rdb-total-row">
                <span>Delivery</span><span>S/ {order.deliveryFee?.toFixed(2)}</span>
              </div>
            )}
            <div className="rdb-total-row rdb-total-row--final">
              <span>Total</span><span>S/ {order.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Repartidor (si tiene) */}
          {order.driver && (
            <>
              <div className="rdb-driver-chip">
                <Bike size={14}/> Repartidor: <strong>{order.driver.user?.name}</strong>
                {order.driver.user?.phone && <a className="rdb-driver-phone" href={`tel:${order.driver.user.phone}`} onClick={event => event.stopPropagation()}> · {order.driver.user.phone}</a>}
              </div>
            </>
          )}

          {order.deliveryProofUrl && (
            <div className="rdb-detail-section">
              <p className="rdb-detail-label">Comprobante de entrega</p>
              <a href={order.deliveryProofUrl} target="_blank" rel="noreferrer">
                <img className="rdb-proof-image" src={order.deliveryProofUrl} alt="Fotografía de la entrega"/>
              </a>
            </div>
          )}

          {/* Acciones */}
          {actions.length > 0 && (
            <div className="rdb-actions">
              {actions.map(action => (
                <button
                  key={action.to}
                  className={`rdb-action-btn ${action.cls}`}
                  disabled={isUpdating}
                  onClick={() => onAction(order.id, action.to)}
                >
                  {isUpdating ? 'Guardando…' : action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Contadores de estado para el encabezado ────────────────────
function StatusCounter({ orders }) {
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {})

  const active = ['PENDING','CONFIRMED','PREPARING','READY']
  const shown  = active.filter(s => counts[s] > 0)
  if (shown.length === 0) return null

  return (
    <div className="rdb-counters">
      {shown.map(s => {
        const cfg = STATUS_CONFIG[s]
        return (
          <div key={s} className="rdb-counter" style={{ background: cfg.bg, color: cfg.color }}>
            <span className="rdb-counter-num">{counts[s]}</span>
            <span className="rdb-counter-lbl">{cfg.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────
export default function RestaurantDashboard() {
  const navigate    = useNavigate()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const restaurant  = user?.restaurant

  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [page,         setPage]         = useState(1)

  const { data, isLoading, isFetching, refetch } = useRestaurantOrders(restaurant?.id, {
    status: statusFilter || undefined,
    type:   typeFilter   || undefined,
    page,
    limit: 15,
  })

  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus()

  const handleAction = useCallback((orderId, status) => {
    updateStatus({ orderId, status })
  }, [updateStatus])

  const orders     = (data?.data || []).filter(order => order.payment?.status === 'PAID')
  const totalPages = data?.pagination?.totalPages || 1

  // ── Sin acceso ─────────────────────────────────────────────
  if (!userLoading && (!user || user.role !== 'RESTAURANT_OWNER')) {
    return (
      <div className="rdb">
        <Navbar />
        <div className="rdb-no-access">
          <ClipboardList size={48} strokeWidth={1.5}/>
          <h2>Acceso restringido</h2>
          <p>Esta sección es solo para dueños de restaurante.</p>
          <button className="rdb-btn-back" onClick={() => navigate('/')}>Volver al inicio</button>
        </div>
      </div>
    )
  }

  // ── Sin restaurante registrado ──────────────────────────────
  if (!userLoading && user && !restaurant) {
    return (
      <div className="rdb">
        <Navbar />
        <div className="rdb-no-access">
          <ClipboardList size={48} strokeWidth={1.5}/>
          <h2>Sin restaurante</h2>
          <p>Aún no tienes un restaurante registrado.</p>
          <button className="rdb-btn-back" onClick={() => navigate('/')}>Volver al inicio</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rdb">
      <Navbar />
      <div className="rdb-inner">

        {/* Encabezado */}
        <div className="rdb-header">
          <div>
            <h1 className="rdb-title">Panel de pedidos</h1>
            {restaurant && <p className="rdb-subtitle">{restaurant.name}</p>}
          </div>
          <button className="rdb-refresh" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={15} className={isFetching ? 'rdb-spin' : ''}/>
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {/* Contadores activos */}
        {!isLoading && <StatusCounter orders={orders} />}

        {/* Filtros por estado */}
        <div className="rdb-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              className={`rdb-tab ${statusFilter === tab.value ? 'active' : ''}`}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filtro por tipo */}
        <div className="rdb-toolbar">
          <select
            className="rdb-type-select"
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          >
            <option value="">Todos los tipos</option>
            <option value="DELIVERY">🛵 Delivery</option>
            <option value="RESERVATION">📅 Reservas</option>
          </select>
          {data?.pagination && (
            <p className="rdb-count">
              {data.pagination.total} pedido{data.pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Skeleton loading */}
        {isLoading && (
          <div className="rdb-skeletons">
            {[1,2,3].map(i => <div key={i} className="rdb-skeleton"/>)}
          </div>
        )}

        {/* Sin pedidos */}
        {!isLoading && orders.length === 0 && (
          <div className="rdb-empty">
            <ClipboardList size={44} strokeWidth={1.5}/>
            <h3>No hay pedidos</h3>
            <p>
              {statusFilter
                ? `No hay pedidos en estado "${STATUS_CONFIG[statusFilter]?.label || statusFilter}"`
                : 'Aún no llegaron pedidos'}
            </p>
          </div>
        )}

        {/* Lista de pedidos */}
        {!isLoading && orders.length > 0 && (
          <div className="rdb-list">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleAction}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="rdb-pagination">
            <button
              className="rdb-page-btn"
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft size={15}/> Anterior
            </button>
            <span className="rdb-page-info">Página {page} de {totalPages}</span>
            <button
              className="rdb-page-btn"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              Siguiente <ChevronRight size={15}/>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
