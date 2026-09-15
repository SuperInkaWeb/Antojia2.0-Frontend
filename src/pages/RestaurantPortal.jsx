import { useMemo, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BarChart3, BookOpen, ChevronRight, ClipboardList, FileText, CookingPot,
  House, LogOut, Menu as MenuIcon, Percent, ReceiptText, Search, Settings,
  ShoppingBag, Star, Store, TrendingUp, Users, X, Wallet, Landmark,
} from 'lucide-react'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import { useRestaurantCustomers, useRestaurantCustomerDetail, useRestaurantOrders, useUpdateOrderStatus, useRestaurantWallet, useRequestRestaurantWithdrawal } from '../hooks/useRestaurantOrders.js'
import { useApplyProductDiscount, useRestaurantProducts } from '../hooks/useProfile.js'
import { SectionMenu, SectionRestaurant } from './Profile.jsx'
import './Profile.css'
import './RestaurantPortal.css'

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'menu', label: 'Menú', icon: BookOpen },
  { id: 'preparacion', label: 'Preparación de menú', icon: CookingPot },
  { id: 'ventas', label: 'Datos de venta', icon: ClipboardList },
  { id: 'promociones', label: 'Promociones', icon: Percent },
  { id: 'facturacion', label: 'Facturación', icon: ReceiptText },
  { id: 'deposito', label: 'Depósito', icon: Wallet },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
]

const money = value => `S/ ${Number(value || 0).toFixed(2)}`
const peruDate = value => new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value))

function itemName(item) {
  return item.product?.name || item.productName || 'Producto'
}

function getRanking(orders) {
  const totals = new Map()
  orders.forEach(order => order.items?.forEach(item => {
    const name = itemName(item)
    totals.set(name, (totals.get(name) || 0) + Number(item.quantity || 0))
  }))
  return [...totals.entries()].sort((a, b) => b[1] - a[1])
}

function Empty({ children }) {
  return <div className="rp-empty"><ShoppingBag size={34}/><p>{children}</p></div>
}

function Overview({ orders, restaurant }) {
  const { data: finances, isLoading: financesLoading } = useRestaurantWallet(restaurant.id)
  const clients = new Set(orders.map(order => order.user?.id || order.user?.email).filter(Boolean)).size
  const ranking = getRanking(orders)
  const buyers = orders.filter(order => order.user).slice(0, 5)

  const cards = [
    { label: 'Clientes totales', value: clients, detail: 'Personas que hicieron pedidos', icon: Users, tone: 'orange' },
    { label: 'Ventas registradas', value: financesLoading ? '…' : money(finances?.recordedSalesTotal ?? finances?.salesTotal), detail: `${(finances?.paidOrderCount || 0) + (finances?.testOrderCount || 0)} pagos confirmados`, icon: TrendingUp, tone: 'green' },
    { label: 'Pedidos registrados', value: orders.length, detail: 'Reservas y delivery', icon: ClipboardList, tone: 'violet' },
    { label: 'Plato más pedido', value: ranking[0]?.[0] || 'Sin ventas', detail: ranking[0] ? `${ranking[0][1]} unidades` : 'Aún sin datos', icon: Star, tone: 'gold' },
  ]

  return <div className="rp-stack">
    <section className="rp-welcome">
      <div><span>Resumen del negocio</span><h1>Hola, {restaurant.name}</h1><p>Revisa el rendimiento de tu restaurante desde un solo lugar.</p></div>
    </section>
    <div className="rp-metrics">{cards.map(card => {
      const Icon = card.icon
      return <article className="rp-metric" key={card.label}>
        <span className={`rp-metric-icon ${card.tone}`}><Icon size={20}/></span>
        <p>{card.label}</p><strong>{card.value}</strong><small>{card.detail}</small>
      </article>
    })}</div>
    <section className="rp-panel rp-income-panel">
      <div className="rp-panel-head"><div><h2>Resumen de tus ingresos</h2><p>Las ventas de prueba no son dinero cobrado ni se pueden retirar.</p></div><Wallet size={20}/></div>
      {financesLoading ? <p>Cargando ingresos…</p> : <>
        <div className="rp-income-grid">
          <div><small>Ganancia neta estimada</small><strong>{money(finances?.restaurantEarnedTotal)}</strong></div>
          <div><small>Saldo disponible para retirar</small><strong>{money(finances?.balance)}</strong></div>
          <div className="rp-income-test"><small>Ventas Mercado Pago de prueba · no cobradas</small><strong>{money(finances?.testSalesTotal)}</strong><span>{finances?.testOrderCount || 0} pago(s) sandbox · tu neto estimado sería {money(finances?.testRestaurantNet)}</span></div>
        </div>
        {Number(finances?.pendingRestaurantNet || 0) > 0 && <p className="rp-income-note">Tienes {money(finances.pendingRestaurantNet)} netos pendientes de liquidación. El administrador debe acreditarlos antes de que aparezcan como saldo disponible para retiro.</p>}
      </>}
    </section>
    <section className="rp-panel">
      <div className="rp-panel-head"><div><h2>Clientes recientes</h2><p>Últimos usuarios que realizaron pedidos</p></div><Users size={20}/></div>
      {buyers.length === 0 ? <Empty>Aún no hay clientes registrados.</Empty> :
        <div className="rp-simple-list">{buyers.map(order => <div key={order.id}>
          <span className="rp-user-avatar">{(order.user.name || 'U')[0]}</span>
          <div><strong>{order.user.name || 'Usuario'}</strong><small>{order.user.email || peruDate(order.createdAt)}</small></div>
          <b>{money(order.total)}</b>
        </div>)}</div>}
    </section>
  </div>
}

function Sales({ orders }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')
  const ranking = useMemo(() => getRanking(orders), [orders])
  const rankIndex = useMemo(() => new Map(ranking.map(([name], index) => [name, index])), [ranking])
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = orders.filter(order => {
      const products = order.items?.map(itemName).join(' ') || ''
      return `${order.user?.name || ''} ${products}`.toLowerCase().includes(query)
    })
    if (sort !== 'recent') result.sort((a, b) => {
      const aRank = Math.min(...(a.items || []).map(item => rankIndex.get(itemName(item)) ?? 9999))
      const bRank = Math.min(...(b.items || []).map(item => rankIndex.get(itemName(item)) ?? 9999))
      return sort === 'best' ? aRank - bRank : bRank - aRank
    })
    return result
  }, [orders, rankIndex, search, sort])

  return <section className="rp-panel">
    <div className="rp-panel-head"><div><h1>Datos de venta</h1><p>Conoce quién pidió, qué productos compró y cuánto pagó.</p></div></div>
    <div className="rp-toolbar">
      <label><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente o plato"/></label>
      <select value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Más recientes</option><option value="best">Platos más vendidos</option><option value="worst">Platos menos vendidos</option></select>
    </div>
    {rows.length === 0 ? <Empty>No encontramos ventas con ese filtro.</Empty> : <div className="rp-sales-list">{rows.map(order => <article key={order.id}>
      <div className="rp-order-main"><span className="rp-user-avatar">{(order.user?.name || 'U')[0]}</span><div><strong>{order.user?.name || 'Usuario'}</strong><small>{peruDate(order.createdAt)}</small></div></div>
      <div className="rp-order-items">{order.items?.map(item => <span key={item.id}>{item.quantity}× {itemName(item)}</span>)}</div>
      <strong>{money(order.total)}</strong>
    </article>)}</div>}
  </section>
}

function Customers({ restaurantId, onSelect }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('highest')
  const { data, isLoading } = useRestaurantCustomers(restaurantId, { search, sort })
  const customers = data?.data || []

  return <section className="rp-panel">
    <div className="rp-panel-head"><div><h1>Clientes</h1><p>Consumo registrado únicamente en tu restaurante.</p></div><Users size={21}/></div>
    <div className="rp-toolbar">
      <label><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre o correo"/></label>
      <select value={sort} onChange={event => setSort(event.target.value)}><option value="highest">Clientes que más consumen</option><option value="lowest">Clientes que menos consumen</option><option value="name">Nombre (A-Z)</option></select>
    </div>
    {isLoading ? <p>Cargando clientes…</p> : customers.length === 0 ? <Empty>No hay clientes que coincidan con este filtro.</Empty> : <div className="rp-customer-list">{customers.map(customer => <button className="rp-customer-card" key={customer.id} onClick={() => onSelect(customer)}>
      {customer.avatarUrl ? <img src={customer.avatarUrl} alt=""/> : <span className="rp-user-avatar">{(customer.name || 'U')[0]}</span>}
      <span className="rp-customer-main"><strong>{customer.name || 'Cliente'}</strong><small>{customer.totalOrders} pedido{customer.totalOrders === 1 ? '' : 's'} · {customer.deliveryOrders} delivery · {customer.reservationOrders} cita{customer.reservationOrders === 1 ? '' : 's'}</small></span>
      <span className="rp-customer-spend"><strong>{money(customer.totalSpent)}</strong><small>Ticket prom. {money(customer.averageTicket)}</small></span><ChevronRight size={18}/>
    </button>)}</div>}
  </section>
}

function CustomerDetail({ detail, isLoading, onClose }) {
  if (isLoading) return <div className="rp-ticket-overlay"><article className="rp-ticket"><p>Cargando cliente…</p></article></div>
  if (!detail) return null
  const { customer, stats, orders } = detail
  return <div className="rp-ticket-overlay" onClick={onClose}><article className="rp-customer-detail" onClick={event => event.stopPropagation()}>
    <button className="rp-ticket-close" onClick={onClose}><X/></button>
    <div className="rp-customer-detail-head">{customer.avatarUrl ? <img src={customer.avatarUrl} alt=""/> : <span className="rp-user-avatar">{(customer.name || 'U')[0]}</span>}<div><h2>{customer.name}</h2><p>{customer.email}</p></div></div>
    <div className="rp-customer-stats"><div><small>Total gastado aquí</small><strong>{money(stats.totalSpent)}</strong></div><div><small>Ticket promedio</small><strong>{money(stats.averageTicket)}</strong></div><div><small>Pedidos / citas</small><strong>{stats.totalOrders}</strong></div></div>
    <div className="rp-customer-breakdown"><span>🛵 Delivery: <b>{stats.delivery.orders}</b> · {money(stats.delivery.totalSpent)}</span><span>📅 Citas: <b>{stats.reservation.orders}</b> · {money(stats.reservation.totalSpent)}</span></div>
    <h3>Historial en tu restaurante</h3>
    <div className="rp-customer-orders">{orders.map(order => <div key={order.id}><span><b>#{order.orderNumber?.slice(-8)}</b><small>{peruDate(order.createdAt)} · {order.type === 'DELIVERY' ? 'Delivery' : 'Cita'}</small></span><strong>{money(order.total)}</strong></div>)}</div>
  </article></div>
}

function MenuPreparation({ orders }) {
  const updateStatus = useUpdateOrderStatus()
  const deliveryOrders = orders.filter(order => order.type === 'DELIVERY' && order.payment?.status === 'PAID' && ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status))
  const advance = async (order) => {
    const status = ['PENDING', 'CONFIRMED'].includes(order.status) ? 'PREPARING' : 'READY'
    try { await updateStatus.mutateAsync({ orderId: order.id, status }) }
    catch { /* el hook muestra el error */ }
  }

  return <section className="rp-panel">
    <div className="rp-panel-head"><div><h1>Preparación de menú</h1><p>Prepara los pedidos delivery y publícalos para los repartidores cuando estén listos.</p></div><CookingPot size={22}/></div>
    {deliveryOrders.length === 0 ? <Empty>No hay pedidos delivery pendientes de preparación.</Empty> : <div className="rp-preparation-list">
      {deliveryOrders.map(order => <article key={order.id} className="rp-preparation-card">
        <div className="rp-preparation-head"><div><strong>Pedido #{order.orderNumber?.slice(-8)}</strong><small>{peruDate(order.createdAt)}</small></div><span className={`rp-preparation-status status-${order.status.toLowerCase()}`}>{order.status === 'PENDING' ? 'Pendiente' : order.status === 'CONFIRMED' ? 'Confirmado' : order.status === 'PREPARING' ? 'Preparando' : 'Listo para recoger'}</span></div>
        <div className="rp-preparation-client"><span className="rp-user-avatar">{(order.user?.name || 'U')[0]}</span><div><small>Cliente</small><strong>{order.user?.name || 'Usuario'}</strong></div></div>
        <div className="rp-order-items">{order.items?.map(item => <span key={item.id}>{item.quantity}× {itemName(item)}</span>)}</div>
        {order.notes && <p className="rp-preparation-notes">Nota: {order.notes}</p>}
        <div className="rp-preparation-action">
          {order.status === 'READY' ? <p>Esperando que un repartidor tome el pedido.</p> : <button className="rp-primary" disabled={updateStatus.isPending} onClick={() => advance(order)}>{updateStatus.isPending ? 'Guardando…' : order.status === 'PREPARING' ? 'Listo para recoger' : 'Empezar preparación'}</button>}
        </div>
      </article>)}
    </div>}
  </section>
}

function Promotions({ restaurantId, orders }) {
  const { data: products = [], isLoading } = useRestaurantProducts(restaurantId)
  const discount = useApplyProductDiscount(restaurantId)
  const [selected, setSelected] = useState([])
  const [all, setAll] = useState(false)
  const [percent, setPercent] = useState(10)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const quantities = useMemo(() => new Map(getRanking(orders)), [orders])
  const shown = useMemo(() => {
    const result = products.filter(product => product.name.toLowerCase().includes(search.toLowerCase()))
    result.sort((a, b) => sort === 'best'
      ? (quantities.get(b.name) || 0) - (quantities.get(a.name) || 0)
      : sort === 'worst' ? (quantities.get(a.name) || 0) - (quantities.get(b.name) || 0) : a.name.localeCompare(b.name))
    return result
  }, [products, quantities, search, sort])

  const apply = async () => {
    const ids = all ? products.map(product => product.id) : selected
    if (!ids.length) return toast.error('Selecciona al menos un plato')
    try {
      await Promise.all(ids.map(productId => discount.mutateAsync({ productId, discountPct: Number(percent) })))
      toast.success(`Promoción aplicada a ${ids.length} producto${ids.length === 1 ? '' : 's'}`)
      setSelected([])
    } catch { /* el hook muestra el error */ }
  }

  return <section className="rp-panel">
    <div className="rp-panel-head"><div><h1>Promociones</h1><p>Aplica descuentos a platos específicos o a todo tu menú.</p></div><Percent size={21}/></div>
    <div className="rp-promo-config">
      <label>Descuento <span><input type="number" min="0" max="100" value={percent} onChange={e => setPercent(e.target.value)}/>%</span></label>
      <label className="rp-all-toggle"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)}/><span>Aplicar la promoción a todos los platos</span></label>
      <button className="rp-primary" disabled={discount.isPending} onClick={apply}>{discount.isPending ? 'Aplicando…' : 'Aplicar promoción'}</button>
    </div>
    <div className="rp-toolbar"><label><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar plato"/></label><select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Nombre</option><option value="best">Más vendidos</option><option value="worst">Menos vendidos</option></select></div>
    {isLoading ? <p>Cargando productos…</p> : <div className={`rp-product-select ${all ? 'disabled' : ''}`}>{shown.map(product => <label key={product.id}>
      <input type="checkbox" disabled={all} checked={all || selected.includes(product.id)} onChange={() => setSelected(current => current.includes(product.id) ? current.filter(id => id !== product.id) : [...current, product.id])}/>
      {product.imageUrl ? <img src={product.imageUrl} alt=""/> : <span className="rp-product-placeholder"><MenuIcon size={18}/></span>}
      <div><strong>{product.name}</strong><small>{money(product.price)} · {quantities.get(product.name) || 0} vendidos</small></div>
      <b>{product.discountPct ? `${product.discountPct}% OFF` : 'Sin descuento'}</b>
    </label>)}</div>}
  </section>
}

function Billing({ orders, restaurant }) {
  const [ticket, setTicket] = useState(null)
  const [search, setSearch] = useState('')
  const paid = orders.filter(order => ['PAID', 'APPROVED'].includes(order.payment?.status))
  const query = search.trim().toLowerCase()
  const filtered = paid.filter(order => `${order.orderNumber || ''} ${order.user?.name || ''}`.toLowerCase().includes(query))
  return <section className="rp-panel">
    <div className="rp-panel-head"><div><h1>Facturación</h1><p>Historial de cobros y tickets de venta en horario del Perú.</p></div><FileText size={21}/></div>
    {paid.length > 0 && <div className="rp-toolbar"><label><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código de factura o nombre completo"/></label></div>}
    {paid.length === 0 ? <Empty>Aún no hay pagos confirmados.</Empty> : filtered.length === 0 ? <Empty>No encontramos facturas con ese filtro.</Empty> : <div className="rp-table-wrap"><table className="rp-table"><thead><tr><th>Factura / venta</th><th>Fecha y hora</th><th>Cliente</th><th>Total</th><th></th></tr></thead><tbody>{filtered.map(order => <tr key={order.id}><td>#{order.orderNumber?.slice(-8) || order.id.slice(-8)}</td><td>{peruDate(order.createdAt)}</td><td>{order.user?.name || 'Usuario'}</td><td><strong>{money(order.total)}</strong></td><td><button onClick={() => setTicket(order)}>Ver ticket <ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>}
    {ticket && <div className="rp-ticket-overlay" onClick={() => setTicket(null)}><article className="rp-ticket" onClick={e => e.stopPropagation()}><button className="rp-ticket-close" onClick={() => setTicket(null)}><X/></button><Store size={32}/><h2>{restaurant.name}</h2><p>Ticket de venta</p><hr/><div><span>Pedido</span><b>#{ticket.orderNumber?.slice(-8)}</b></div><div><span>Fecha</span><b>{peruDate(ticket.createdAt)}</b></div><div><span>Cliente</span><b>{ticket.user?.name || 'Usuario'}</b></div><hr/>{ticket.items?.map(item => <div key={item.id}><span>{item.quantity}× {itemName(item)}</span><b>{money(item.subtotal)}</b></div>)}<hr/><div className="rp-ticket-total"><span>Total</span><b>{money(ticket.total)}</b></div><small>Pago confirmado por Mercado Pago</small></article></div>}
  </section>
}

const WITHDRAWAL_STATUS = { PENDING: 'Pendiente', PROCESSING: 'En proceso', PAID: 'Transferido', REJECTED: 'Rechazado' }

function Deposit({ restaurantId }) {
  const { data: wallet, isLoading } = useRestaurantWallet(restaurantId)
  const withdrawal = useRequestRestaurantWithdrawal(restaurantId)
  const [form, setForm] = useState({ amount: '', bankName: '', accountHolder: '', accountNumber: '', cci: '', accountType: 'CUENTA' })
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => {
    event.preventDefault()
    withdrawal.mutate({ ...form, amount: Number(form.amount) })
  }

  return <section className="rp-panel rp-deposit">
    <div className="rp-panel-head"><div><h1>Depósito y retiros</h1><p>Revisa el saldo que te acreditó el administrador y solicita una transferencia a tu cuenta.</p></div><Wallet size={21}/></div>
    <div className="rp-deposit-balance"><div><small>Saldo disponible</small><strong>{isLoading ? 'Cargando…' : money(wallet?.balance)}</strong></div><Wallet size={24}/></div>
    <form className="rp-withdraw-form" onSubmit={submit}>
      <h2><Landmark size={18}/> Solicitar retiro bancario</h2>
      <p>Ingresa una cuenta bancaria o CCI a tu nombre. No escribas claves, CVV ni códigos de seguridad de tarjetas.</p>
      <label>Monto a retirar<input type="number" name="amount" min="0.01" max={wallet?.balance || 0} step="0.01" required value={form.amount} onChange={update} placeholder="S/ 0.00"/></label>
      <div className="rp-withdraw-grid">
        <label>Banco<input name="bankName" required maxLength="80" value={form.bankName} onChange={update} placeholder="Nombre del banco"/></label>
        <label>Titular de la cuenta<input name="accountHolder" required maxLength="120" value={form.accountHolder} onChange={update} placeholder="Nombre completo"/></label>
        <label>Tipo de cuenta<select name="accountType" value={form.accountType} onChange={update}><option value="CUENTA">Cuenta bancaria</option><option value="AHORROS">Ahorros</option><option value="CORRIENTE">Corriente</option></select></label>
        <label>Número de cuenta<input name="accountNumber" inputMode="numeric" minLength="8" maxLength="20" value={form.accountNumber} onChange={update} placeholder="8 a 20 dígitos"/></label>
        <label>CCI (opcional)<input name="cci" inputMode="numeric" minLength="20" maxLength="20" value={form.cci} onChange={update} placeholder="20 dígitos"/></label>
      </div>
      <button className="rp-primary" disabled={withdrawal.isPending || !wallet?.balance || Number(form.amount) > Number(wallet?.balance || 0)}>{withdrawal.isPending ? 'Enviando solicitud…' : 'Solicitar retiro'}</button>
    </form>
    <div className="rp-deposit-history">
      <h2>Saldo acreditado</h2>
      {!wallet?.payouts?.length ? <Empty>Aún no tienes depósitos acreditados.</Empty> : wallet.payouts.map(payout => <article key={payout.id}><span>{peruDate(payout.createdAt)}</span><strong>+{money(payout.netAmount)}</strong></article>)}
      <h2>Solicitudes de retiro</h2>
      {!wallet?.withdrawals?.length ? <Empty>Aún no solicitaste retiros.</Empty> : wallet.withdrawals.map(item => <article key={item.id}><span>{peruDate(item.createdAt)} · {item.bankName} · {item.destinationAccountMasked} · {WITHDRAWAL_STATUS[item.status] || item.status}</span><strong>−{money(item.amount)}</strong></article>)}
    </div>
  </section>
}

export default function RestaurantPortal() {
  const navigate = useNavigate()
  const { logout } = useAuth0()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const restaurant = user?.restaurant
  const [section, setSection] = useState('dashboard')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const { data, isLoading: ordersLoading } = useRestaurantOrders(restaurant?.id, { page: 1, limit: 500 })
  const { data: customerDetail, isLoading: customerDetailLoading } = useRestaurantCustomerDetail(restaurant?.id, selectedCustomer?.id)
  const orders = data?.data || []
  const handleLogout = () => {
    sessionStorage.removeItem('foodinka_authenticated')
    sessionStorage.removeItem('foodinka_recovery_attempted')
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  if (userLoading) return <div className="rp-loading">Cargando panel del restaurante…</div>
  if (!user || user.role !== 'RESTAURANT_OWNER' || !restaurant) return <div className="rp-access"><Store size={45}/><h1>Panel no disponible</h1><p>Necesitas registrar y tener asociado un restaurante.</p><button onClick={() => navigate('/register-restaurant')}>Registrar restaurante</button></div>

  return <div className="rp">
    <aside className="rp-sidebar">
      <button className="rp-brand" onClick={() => navigate('/')}><span><Store size={22}/></span><div><b>Antojia</b><small>Panel restaurante</small></div></button>
      <div className="rp-restaurant"><strong>{restaurant.name}</strong><small>{restaurant.isApproved ? 'Restaurante aprobado' : 'Pendiente de aprobación'}</small></div>
      <nav>{SECTIONS.map(item => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><Icon size={18}/><span>{item.label}</span><ChevronRight size={15}/></button> })}</nav>
      <button className="rp-orders-link" onClick={() => navigate('/restaurant-orders')}><ShoppingBag size={18}/> Gestionar pedidos</button>
      <button className="rp-logout" onClick={handleLogout}><LogOut size={17}/> Cerrar sesión</button>
      <button className="rp-home" onClick={() => navigate('/')}><House size={17}/> Volver a la tienda</button>
    </aside>
    <main className="rp-main"><header className="rp-topbar"><div><small>Panel del restaurante</small><strong>{SECTIONS.find(item => item.id === section)?.label}</strong></div></header>
      <div className="rp-content">{ordersLoading && section !== 'menu' && section !== 'promociones' ? <div className="rp-loading">Preparando tus datos…</div> : <>
        {section === 'dashboard' && <Overview orders={orders} restaurant={restaurant}/>} {section === 'clientes' && <Customers restaurantId={restaurant.id} onSelect={setSelectedCustomer}/>} {section === 'menu' && <SectionMenu restaurant={restaurant}/>} {section === 'preparacion' && <MenuPreparation orders={orders}/>} {section === 'ventas' && <Sales orders={orders}/>} {section === 'promociones' && <Promotions restaurantId={restaurant.id} orders={orders}/>} {section === 'facturacion' && <Billing orders={orders} restaurant={restaurant}/>} {section === 'deposito' && <Deposit restaurantId={restaurant.id}/>} {section === 'configuracion' && <SectionRestaurant restaurant={restaurant}/>} </>}
        {selectedCustomer && <CustomerDetail detail={customerDetail} isLoading={customerDetailLoading} onClose={() => setSelectedCustomer(null)}/>}
      </div>
    </main>
  </div>
}
