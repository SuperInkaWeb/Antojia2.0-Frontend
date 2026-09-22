import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldAlert, LogOut, Gift, Plus, Trash2, Power } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser.js'
import { useMarketingAnalytics, useMarketingSettlements, useMarketingCreditRestaurant, useMarketingRewards, useMarketingRewardMutations } from '../../hooks/useAdmin.js'
import { api, setAuthToken } from '../../config/api.js'
import './Dashboard.css'
import './MarketingDashboard.css'

const money = value => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

function RevenueChart({ timeline }) {
  if (!timeline.length) return <div className="marketing-chart-empty">No hay ventas en el periodo seleccionado.</div>

  const width = Math.max(760, timeline.length * 76 + 82)
  const height = 330
  const left = 76
  const right = 18
  const top = 24
  const bottom = 58
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const maxValue = Math.max(1, ...timeline.flatMap(row => [row.sales, row.testSales || 0]))
  const roughStep = maxValue / 4
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalizedStep = roughStep / magnitude
  const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * magnitude
  const axisMax = step * 4
  const y = value => top + plotHeight - value / axisMax * plotHeight
  const groupWidth = plotWidth / timeline.length
  const barWidth = Math.min(22, groupWidth * 0.28)

  return <div className="marketing-chart-scroll">
    <svg className="marketing-revenue-chart" style={{ width: `${width}px` }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de ventas por periodo: ventas pagadas y ventas de prueba no cobradas">
      {[0, 1, 2, 3, 4].map(tick => {
        const value = axisMax * tick / 4
        const yPosition = y(value)
        return <g key={tick}>
          <line x1={left} x2={width - right} y1={yPosition} y2={yPosition} className="marketing-chart-gridline" />
          <text x={left - 10} y={yPosition + 4} textAnchor="end" className="marketing-chart-axis-label">{money(value)}</text>
        </g>
      })}
      <text x="18" y={top + plotHeight / 2} transform={`rotate(-90 18 ${top + plotHeight / 2})`} textAnchor="middle" className="marketing-chart-y-title">Monto de ventas</text>
      {timeline.map((row, index) => {
        const center = left + groupWidth * (index + 0.5)
        const paidHeight = row.sales ? Math.max(2, row.sales / axisMax * plotHeight) : 0
        const testHeight = row.testSales ? Math.max(2, row.testSales / axisMax * plotHeight) : 0
        const paidX = center - barWidth - 2
        const testX = center + 2
        return <g key={row.period}>
          <rect x={paidX} y={top + plotHeight - paidHeight} width={barWidth} height={paidHeight} rx="4" className="marketing-chart-paid">
            <title>{`${row.period} · Ventas pagadas: ${money(row.sales)} · Comisión de plataforma: ${money(row.adminEarnings)} · Pedidos: ${row.orders}`}</title>
          </rect>
          <rect x={testX} y={top + plotHeight - testHeight} width={barWidth} height={testHeight} rx="4" className="marketing-chart-test">
            <title>{`${row.period} · Ventas de prueba no cobradas: ${money(row.testSales)} · Comisión simulada: ${money(row.testAdminEarnings)} · Pedidos de prueba: ${row.testOrders}`}</title>
          </rect>
          <text x={center} y={height - 32} textAnchor="middle" className="marketing-chart-period">{row.period}</text>
        </g>
      })}
      <text x={left + plotWidth / 2} y={height - 7} textAnchor="middle" className="marketing-chart-x-title">Periodo ({timeline.length && timeline[0].period.length === 4 ? 'año' : timeline[0].period.length === 7 ? 'mes' : 'semana'})</text>
    </svg>
  </div>
}

function Analytics() {
  const [period, setPeriod] = useState('month')
  const { data: response, isLoading } = useMarketingAnalytics(period)
  const data = response?.data
  return <section>
    <div className="marketing-controls">{[['week','Semanas'],['month','Meses'],['year','Años']].map(([key,label]) => <button className={period===key?'selected':''} key={key} onClick={()=>setPeriod(key)}>{label}</button>)}</div>
    {isLoading ? <p>Cargando datos…</p> : !data ? <p>No se pudieron cargar los datos.</p> : <>
      <div className="marketing-kpis"><article><span>Restaurantes registrados</span><strong>{data.totalRestaurants}</strong></article><article><span>Ventas pagadas</span><strong>{money(data.totalSales)}</strong></article><article><span>Ganancia real de la plataforma</span><strong>{money(data.adminEarnings)}</strong></article><article className="marketing-test-kpi"><span>Ventas de prueba · no cobradas</span><strong>{money(data.testSales)}</strong><small>Comisión simulada: {money(data.testAdminEarnings)}</small></article></div>
      <article className="marketing-card marketing-chart-card"><div className="marketing-chart-heading"><div><h2>Ventas de restaurantes por periodo</h2><p>Compara ventas cobradas con pedidos de prueba. Las ventas están expresadas en soles.</p></div><span className="marketing-chart-unit">Soles (S/)</span></div><div className="marketing-legend"><span><i className="legend-paid"/>Ventas pagadas</span><span><i className="legend-test"/>Ventas de prueba · no cobradas</span><small>Pasa el cursor sobre una barra para ver ventas, comisión y pedidos.</small></div><RevenueChart timeline={data.timeline}/></article>
      <article className="marketing-card"><h2>Ventas por restaurante</h2><div className="marketing-list">{data.restaurants.map(r=><div key={r.id}><span>{r.name}<small>{r.orders} pedidos pagados · {r.testOrders} de prueba</small></span><strong>{money(r.sales)}</strong><small>Pruebas: {money(r.testSales)}</small></div>)}</div></article>
    </>}
  </section>
}

function Payouts() {
  const { data: response, isLoading } = useMarketingSettlements()
  const credit = useMarketingCreditRestaurant()
  const settlements = response?.data
  const restaurants = settlements?.restaurants || []
  const withdrawals = settlements?.withdrawalRequests || []
  if (isLoading) return <p>Cargando pagos…</p>
  return <>
    <section className="marketing-card marketing-settlements"><h2>Liquidaciones de restaurantes</h2><p className="marketing-settlement-note">Los importes de prueba se muestran como referencia y no se acreditan porque no fueron cobrados.</p>{restaurants.length===0?<p>No hay restaurantes registrados.</p>:restaurants.map(r=><article className="marketing-restaurant-settlement" key={r.id}>
      <h3>{r.name}</h3><p>{r.owner?.name || ''}{r.owner?.email ? ` · ${r.owner.email}` : ''}</p>
      <div className="marketing-settlement-grid"><div><span>Ventas pagadas</span><strong>{money(r.salesTotal)}</strong></div><div><span>Ventas por liquidar</span><strong>{money(r.pendingSales)}</strong></div><div><span>Comisión plataforma ({settlements.commissionPercent}%)</span><strong>{money(r.adminEarnedTotal)}</strong></div><div><span>Ganancia del restaurante</span><strong>{money(r.restaurantEarnedTotal)}</strong></div><div className="wallet"><span>Saldo disponible para retiro</span><strong>{money(r.walletBalance)}</strong></div><div className="test"><span>Ventas de prueba · no cobradas ({r.testPaidOrderCount || 0})</span><strong>{money(r.testSalesTotal)}</strong><small>Comisión simulada: {money(r.testAdminCommission)} · neto simulado: {money(r.testRestaurantNet)} · saldo de prueba: {money(r.testBalance)}</small></div></div>
      <button className="marketing-credit-button" disabled={credit.isPending||r.pendingSales<0.01} onClick={()=>credit.mutate(r.id)}>{credit.isPending?'Acreditando…':'Pagar restaurante'}</button><small className="marketing-settlement-note">Acredita el neto de ventas reales al saldo del restaurante. La transferencia bancaria se registra en solicitudes de retiro.</small>
      <div className="marketing-payout-history"><strong>Últimas liquidaciones</strong>{r.payouts?.length?r.payouts.slice(0,5).map((p,i)=><span key={`${p.createdAt}-${i}`}>{new Date(p.createdAt).toLocaleString('es-PE')} · {money(p.netAmount)} al restaurante</span>):<span>Aún no se han acreditado liquidaciones.</span>}</div>
    </article>)}</section>
    <section className="marketing-card"><h2>Solicitudes de retiro</h2>{withdrawals.length===0?<p>No hay retiros pendientes.</p>:withdrawals.map(w=><div className={`marketing-withdrawal ${w.isTest ? 'marketing-withdrawal--test' : ''}`} key={w.id}><div><strong>{w.isTest ? '🧪 Solicitud de prueba · ' : ''}{w.restaurant.name}</strong><span>{money(w.amount)} · {new Date(w.createdAt).toLocaleString('es-PE')}</span><span>{w.bankName} · {w.accountHolder} · {w.destinationAccountMasked}</span>{w.bankDetails?.accountNumber&&<span>Cuenta: {w.bankDetails.accountNumber}</span>}{w.bankDetails?.cci&&<span>CCI: {w.bankDetails.cci}</span>}</div><small className="marketing-settlement-note">La transferencia y el registro del pago los gestiona AdminFinanzas.</small></div>)}</section>
  </>
}

function Rewards() {
  const { data: response, isLoading } = useMarketingRewards()
  const mutations = useMarketingRewardMutations()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'PROMOTION', title: '', description: '', code: '', discountPct: '', discountAmount: '', rewardPoints: '', minPurchase: 0, usageLimit: '', startsAt: '', endsAt: '' })
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => { event.preventDefault(); mutations.create.mutate(form, { onSuccess: () => { setShowForm(false); setForm({ type: 'PROMOTION', title: '', description: '', code: '', discountPct: '', discountAmount: '', rewardPoints: '', minPurchase: 0, usageLimit: '', startsAt: '', endsAt: '' }) } }) }
  const rewards = response?.data || []
  return <section className="marketing-rewards-page">
    <div className="marketing-card marketing-rewards-intro"><div><h2>Promociones y recompensas</h2><p>Crea beneficios para incentivar las compras y fidelizar a tus clientes.</p></div><button className="marketing-primary-button" onClick={() => setShowForm(value => !value)}><Plus size={17}/> {showForm ? 'Cerrar' : 'Nueva recompensa'}</button></div>
    {showForm && <form className="marketing-card marketing-reward-form" onSubmit={submit}><h2>Crear recompensa</h2><div className="marketing-form-grid"><label>Tipo<select name="type" value={form.type} onChange={update}><option value="PROMOTION">Promoción / descuento</option><option value="PURCHASE_REWARD">Recompensa por compra</option></select></label><label>Título<input required name="title" value={form.title} onChange={update} placeholder="Ej. 20% de descuento"/></label><label>Código (opcional)<input name="code" value={form.code} onChange={update} placeholder="ANTOJIA20"/></label><label>Compra mínima (S/)<input type="number" min="0" step="0.01" name="minPurchase" value={form.minPurchase} onChange={update}/></label>{form.type === 'PROMOTION' ? <><label>Descuento (%)<input type="number" min="0" max="100" name="discountPct" value={form.discountPct} onChange={update}/></label><label>Descuento fijo (S/)<input type="number" min="0" step="0.01" name="discountAmount" value={form.discountAmount} onChange={update}/></label></> : <label>Puntos por compra<input required type="number" min="1" name="rewardPoints" value={form.rewardPoints} onChange={update}/></label>}<label>Límite de usos<input type="number" min="1" name="usageLimit" value={form.usageLimit} onChange={update} placeholder="Sin límite"/></label><label>Inicio<input type="date" name="startsAt" value={form.startsAt} onChange={update}/></label><label>Fin<input type="date" name="endsAt" value={form.endsAt} onChange={update}/></label></div><label>Descripción<textarea name="description" value={form.description} onChange={update} rows="3" placeholder="Explica el beneficio para los clientes…"/></label><button className="marketing-primary-button" disabled={mutations.create.isPending}>{mutations.create.isPending ? 'Guardando…' : 'Guardar recompensa'}</button></form>}
    <section className="marketing-card"><div className="marketing-rewards-heading"><h2>Beneficios configurados</h2><span>{rewards.length} en total</span></div>{isLoading ? <p>Cargando recompensas…</p> : rewards.length === 0 ? <div className="marketing-rewards-empty"><Gift size={30}/><p>Aún no hay promociones o recompensas creadas.</p></div> : <div className="marketing-reward-list">{rewards.map(reward => <article key={reward.id} className={!reward.isActive ? 'inactive' : ''}><div className="marketing-reward-icon"><Gift size={20}/></div><div className="marketing-reward-content"><div className="marketing-reward-title"><strong>{reward.title}</strong><span className={`marketing-reward-status ${reward.isActive ? 'active' : ''}`}>{reward.isActive ? 'Activa' : 'Inactiva'}</span></div><p>{reward.description || (reward.type === 'PROMOTION' ? 'Promoción de descuento' : `${reward.rewardPoints} puntos por compra`)}</p><small>{reward.code ? `Código: ${reward.code} · ` : ''}{reward.minPurchase > 0 ? `Compra mínima: ${money(reward.minPurchase)}` : 'Sin compra mínima'}{reward.discountPct ? ` · ${reward.discountPct}% de descuento` : ''}{reward.discountAmount ? ` · ${money(reward.discountAmount)} de descuento` : ''}</small></div><div className="marketing-reward-actions"><button title={reward.isActive ? 'Desactivar' : 'Activar'} onClick={() => mutations.toggle.mutate(reward.id)}><Power size={16}/></button><button title="Eliminar" onClick={() => window.confirm('¿Eliminar esta recompensa?') && mutations.remove.mutate(reward.id)}><Trash2 size={16}/></button></div></article>)}</div>}</section>
  </section>
}

export default function MarketingDashboard() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const [section,setSection]=useState('analytics')
  if(isLoading||(isAuthenticated&&userLoading)) return <div className="dashboard-loading">Cargando…</div>
  if(!isAuthenticated||currentUser?.role!=='MARKETING_ADMIN') return <div className="dashboard-loading" style={{minHeight:'100vh',flexDirection:'column',gap:14}}><ShieldAlert size={46} color="#dc2626"/><strong>No tienes acceso al panel de marketing</strong><button className="dashboard-login-admin" onClick={()=>loginWithRedirect({authorizationParams:{prompt:'login'},appState:{returnTo:'/adminMark'}})}>Iniciar sesión</button></div>
  return <div className="dashboard"><aside className="sidebar"><div className="sidebar-logo"><span>Antojia</span><small>Marketing</small></div><nav className="sidebar-nav"><button className={`sidebar-item ${section==='analytics'?'sidebar-item--active':''}`} onClick={()=>setSection('analytics')}>Ingresos y restaurantes</button><button className={`sidebar-item ${section==='rewards'?'sidebar-item--active':''}`} onClick={()=>setSection('rewards')}><Gift size={16}/>Recompensas</button></nav><div className="sidebar-footer"><button className="sidebar-logout" onClick={async()=>{try{const token=await getAccessTokenSilently({authorizationParams:{audience:import.meta.env.VITE_AUTH0_AUDIENCE}});setAuthToken(token);await api.post('/api/v1/auth/admin-session/end')}catch{sessionStorage.setItem('foodinka_session_end_pending','true')}sessionStorage.removeItem('foodinka_authenticated');logout({logoutParams:{returnTo:window.location.origin}})}}><LogOut size={16}/>Cerrar sesión</button></div></aside><main className="dashboard-main"><header className="dashboard-topbar"><h1 className="dashboard-section-title">{section==='analytics'?'Ingresos y restaurantes':'Recompensas'}</h1><div className="dashboard-user">{user?.name}</div></header><div className="dashboard-content">{section==='analytics'?<Analytics/>:<Rewards/>}</div></main></div>
}
