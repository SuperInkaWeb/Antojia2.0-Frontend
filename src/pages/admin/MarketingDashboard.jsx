import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldAlert, LogOut } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser.js'
import { useMarketingAnalytics, useMarketingSettlements, useMarketingPayoutMutation, useMarketingCreditRestaurant } from '../../hooks/useAdmin.js'
import { api, setAuthToken } from '../../config/api.js'
import './Dashboard.css'
import './MarketingDashboard.css'

const money = value => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

function Analytics() {
  const [period, setPeriod] = useState('month')
  const { data: response, isLoading } = useMarketingAnalytics(period)
  const data = response?.data
  const max = Math.max(1, ...(data?.timeline || []).flatMap(row => [row.sales, row.testSales || 0]))
  return <section>
    <div className="marketing-controls">{[['week','Semanas'],['month','Meses'],['year','Años']].map(([key,label]) => <button className={period===key?'selected':''} key={key} onClick={()=>setPeriod(key)}>{label}</button>)}</div>
    {isLoading ? <p>Cargando datos…</p> : !data ? <p>No se pudieron cargar los datos.</p> : <>
      <div className="marketing-kpis"><article><span>Restaurantes registrados</span><strong>{data.totalRestaurants}</strong></article><article><span>Ventas pagadas</span><strong>{money(data.totalSales)}</strong></article><article><span>Ganancia real de la plataforma</span><strong>{money(data.adminEarnings)}</strong></article><article className="marketing-test-kpi"><span>Ventas de prueba · no cobradas</span><strong>{money(data.testSales)}</strong><small>Comisión simulada: {money(data.testAdminEarnings)}</small></article></div>
      <article className="marketing-card"><h2>Ventas y ganancia de la plataforma</h2><div className="marketing-chart">{data.timeline.length ? data.timeline.map(row=><div className="marketing-bar" key={row.period} title={`${row.period}\nVentas pagadas: ${money(row.sales)}\nGanancia admin: ${money(row.adminEarnings)}\nVentas de prueba · no cobradas: ${money(row.testSales)}\nComisión simulada: ${money(row.testAdminEarnings)}\nPedidos pagados: ${row.orders} · pedidos de prueba: ${row.testOrders}`}><div style={{height:`${Math.max(3,row.sales/max*100)}%`}}/><div className="marketing-test-bar" style={{height:`${Math.max(0,(row.testSales||0)/max*100)}%`}}/><small>{row.period}</small></div>) : <p>No hay ventas en este periodo.</p>}</div><div className="marketing-legend"><span>Ventas pagadas · ventas de prueba (no cobradas)</span><span>Pasa el cursor para ver fecha, ventas y comisiones</span></div></article>
      <article className="marketing-card"><h2>Ventas por restaurante</h2><div className="marketing-list">{data.restaurants.map(r=><div key={r.id}><span>{r.name}<small>{r.orders} pedidos pagados · {r.testOrders} de prueba</small></span><strong>{money(r.sales)}</strong><small>Pruebas: {money(r.testSales)}</small></div>)}</div></article>
    </>}
  </section>
}

function Payouts() {
  const { data: response, isLoading } = useMarketingSettlements()
  const mutation = useMarketingPayoutMutation()
  const credit = useMarketingCreditRestaurant()
  const [refs, setRefs] = useState({})
  const settlements = response?.data
  const restaurants = settlements?.restaurants || []
  const withdrawals = settlements?.withdrawalRequests || []
  if (isLoading) return <p>Cargando pagos…</p>
  return <>
    <section className="marketing-card marketing-settlements"><h2>Liquidaciones de restaurantes</h2><p className="marketing-settlement-note">Los importes de prueba se muestran como referencia y no se acreditan porque no fueron cobrados.</p>{restaurants.length===0?<p>No hay restaurantes registrados.</p>:restaurants.map(r=><article className="marketing-restaurant-settlement" key={r.id}>
      <h3>{r.name}</h3><p>{r.owner?.name || ''}{r.owner?.email ? ` · ${r.owner.email}` : ''}</p>
      <div className="marketing-settlement-grid"><div><span>Ventas pagadas</span><strong>{money(r.salesTotal)}</strong></div><div><span>Ventas por liquidar</span><strong>{money(r.pendingSales)}</strong></div><div><span>Comisión plataforma ({settlements.commissionPercent}%)</span><strong>{money(r.adminEarnedTotal)}</strong></div><div><span>Ganancia del restaurante</span><strong>{money(r.restaurantEarnedTotal)}</strong></div><div className="wallet"><span>Saldo disponible para retiro</span><strong>{money(r.walletBalance)}</strong></div><div className="test"><span>Ventas de prueba · no cobradas ({r.testPaidOrderCount || 0})</span><strong>{money(r.testSalesTotal)}</strong><small>Comisión simulada: {money(r.testAdminCommission)} · neto simulado: {money(r.testRestaurantNet)}</small></div></div>
      <button className="marketing-credit-button" disabled={credit.isPending||r.pendingSales<0.01} onClick={()=>credit.mutate(r.id)}>{credit.isPending?'Acreditando…':'Pagar restaurante'}</button><small className="marketing-settlement-note">Acredita el neto de ventas reales al saldo del restaurante. La transferencia bancaria se registra en solicitudes de retiro.</small>
      <div className="marketing-payout-history"><strong>Últimas liquidaciones</strong>{r.payouts?.length?r.payouts.slice(0,5).map((p,i)=><span key={`${p.createdAt}-${i}`}>{new Date(p.createdAt).toLocaleString('es-PE')} · {money(p.netAmount)} al restaurante</span>):<span>Aún no se han acreditado liquidaciones.</span>}</div>
    </article>)}</section>
    <section className="marketing-card"><h2>Solicitudes de retiro pendientes</h2>{withdrawals.length===0?<p>No hay retiros pendientes.</p>:withdrawals.map(w=><div className="marketing-withdrawal" key={w.id}><div><strong>{w.restaurant.name}</strong><span>{money(w.amount)} · {new Date(w.createdAt).toLocaleString('es-PE')}</span><span>{w.bankName} · {w.accountHolder} · {w.destinationAccountMasked}</span>{w.bankDetails?.accountNumber&&<span>Cuenta: {w.bankDetails.accountNumber}</span>}{w.bankDetails?.cci&&<span>CCI: {w.bankDetails.cci}</span>}</div><input placeholder="N.º de operación" value={refs[w.id]||''} onChange={e=>setRefs({...refs,[w.id]:e.target.value})}/><button disabled={mutation.isPending||!refs[w.id]?.trim()} onClick={()=>mutation.mutate({id:w.id,transferReference:refs[w.id].trim()})}>Marcar como transferido</button></div>)}</section>
  </>
}

export default function MarketingDashboard() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const [section,setSection]=useState('analytics')
  if(isLoading||(isAuthenticated&&userLoading)) return <div className="dashboard-loading">Cargando…</div>
  if(!isAuthenticated||currentUser?.role!=='MARKETING_ADMIN') return <div className="dashboard-loading" style={{minHeight:'100vh',flexDirection:'column',gap:14}}><ShieldAlert size={46} color="#dc2626"/><strong>No tienes acceso al panel de marketing</strong><button className="dashboard-login-admin" onClick={()=>loginWithRedirect({authorizationParams:{prompt:'login'},appState:{returnTo:'/adminMark/register'}})}>Iniciar sesión</button></div>
  return <div className="dashboard"><aside className="sidebar"><div className="sidebar-logo"><span>Antojia</span><small>Marketing</small></div><nav className="sidebar-nav"><button className={`sidebar-item ${section==='analytics'?'sidebar-item--active':''}`} onClick={()=>setSection('analytics')}>Ingresos y restaurantes</button><button className={`sidebar-item ${section==='payouts'?'sidebar-item--active':''}`} onClick={()=>setSection('payouts')}>Pagar restaurantes</button></nav><div className="sidebar-footer"><button className="sidebar-logout" onClick={async()=>{try{const token=await getAccessTokenSilently({authorizationParams:{audience:import.meta.env.VITE_AUTH0_AUDIENCE}});setAuthToken(token);await api.post('/api/v1/auth/admin-session/end')}catch{sessionStorage.setItem('foodinka_session_end_pending','true')}sessionStorage.removeItem('foodinka_authenticated');logout({logoutParams:{returnTo:window.location.origin}})}}><LogOut size={16}/>Cerrar sesión</button></div></aside><main className="dashboard-main"><header className="dashboard-topbar"><h1 className="dashboard-section-title">{section==='analytics'?'Ingresos y restaurantes':'Pagos a restaurantes'}</h1><div className="dashboard-user">{user?.name}</div></header><div className="dashboard-content">{section==='analytics'?<Analytics/>:<Payouts/>}</div></main></div>
}
