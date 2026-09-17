import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldAlert, LogOut } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser.js'
import { useMarketingAnalytics, useMarketingSettlements, useMarketingPayoutMutation } from '../../hooks/useAdmin.js'
import { api, setAuthToken } from '../../config/api.js'
import './Dashboard.css'
import './MarketingDashboard.css'

const money = value => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

function Analytics() {
  const [period, setPeriod] = useState('month')
  const { data: response, isLoading } = useMarketingAnalytics(period)
  const data = response?.data
  const max = Math.max(1, ...(data?.timeline || []).map(row => row.sales))
  return <section>
    <div className="marketing-controls">{[['week','Semanas'],['month','Meses'],['year','Años']].map(([key,label]) => <button className={period===key?'selected':''} key={key} onClick={()=>setPeriod(key)}>{label}</button>)}</div>
    {isLoading ? <p>Cargando datos…</p> : !data ? <p>No se pudieron cargar los datos.</p> : <>
      <div className="marketing-kpis"><article><span>Restaurantes registrados</span><strong>{data.totalRestaurants}</strong></article><article><span>Ventas del periodo</span><strong>{money(data.totalSales)}</strong></article><article><span>Ganancia de la plataforma</span><strong>{money(data.adminEarnings)}</strong></article></div>
      <article className="marketing-card"><h2>Ventas y ganancia de la plataforma</h2><div className="marketing-chart">{data.timeline.length ? data.timeline.map(row=><div className="marketing-bar" key={row.period} title={`${row.period}\nVentas: ${money(row.sales)}\nGanancia admin: ${money(row.adminEarnings)}\nPedidos: ${row.orders}`}><div style={{height:`${Math.max(3,row.sales/max*100)}%`}}/><small>{row.period}</small></div>) : <p>No hay pagos confirmados para este periodo.</p>}</div><div className="marketing-legend"><span>Ventas restaurantes</span><span>El tooltip muestra la ganancia de plataforma y fecha</span></div></article>
      <article className="marketing-card"><h2>Ventas por restaurante</h2><div className="marketing-list">{data.restaurants.map(r=><div key={r.id}><span>{r.name}</span><strong>{money(r.sales)}</strong><small>{r.orders} pedidos</small></div>)}</div></article>
    </>}
  </section>
}

function Payouts() {
  const { data: response, isLoading } = useMarketingSettlements()
  const mutation = useMarketingPayoutMutation()
  const [refs, setRefs] = useState({})
  const withdrawals = response?.data?.restaurants?.flatMap(r=>(r.withdrawals||[]).filter(w=>w.status==='PENDING').map(w=>({...w,restaurantName:r.name}))) || []
  if (isLoading) return <p>Cargando pagos…</p>
  return <section className="marketing-card"><h2>Retiros pendientes de restaurantes</h2>{withdrawals.length===0?<p>No hay retiros pendientes.</p>:withdrawals.map(w=><div className="marketing-withdrawal" key={w.id}><div><strong>{w.restaurantName}</strong><span>{money(w.amount)} · {new Date(w.createdAt).toLocaleString('es-PE')}</span></div><input placeholder="N.º de operación" value={refs[w.id]||''} onChange={e=>setRefs({...refs,[w.id]:e.target.value})}/><button disabled={mutation.isPending||!refs[w.id]?.trim()} onClick={()=>mutation.mutate({id:w.id,transferReference:refs[w.id]})}>Registrar pago</button></div>)}</section>
}

export default function MarketingDashboard() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const [section,setSection]=useState('analytics')
  if(isLoading||(isAuthenticated&&userLoading)) return <div className="dashboard-loading">Cargando…</div>
  if(!isAuthenticated||currentUser?.role!=='MARKETING_ADMIN') return <div className="dashboard-loading" style={{minHeight:'100vh',flexDirection:'column',gap:14}}><ShieldAlert size={46} color="#dc2626"/><strong>No tienes acceso al panel de marketing</strong><button className="dashboard-login-admin" onClick={()=>loginWithRedirect({authorizationParams:{prompt:'login'},appState:{returnTo:'/adminMark/register'}})}>Iniciar sesión</button></div>
  return <div className="dashboard"><aside className="sidebar"><div className="sidebar-logo"><span>Antojia</span><small>Marketing</small></div><nav className="sidebar-nav"><button className={`sidebar-item ${section==='analytics'?'sidebar-item--active':''}`} onClick={()=>setSection('analytics')}>Ingresos y restaurantes</button><button className={`sidebar-item ${section==='payouts'?'sidebar-item--active':''}`} onClick={()=>setSection('payouts')}>Pagar restaurantes</button></nav><div className="sidebar-footer"><button className="sidebar-logout" onClick={async()=>{try{const token=await getAccessTokenSilently({authorizationParams:{audience:import.meta.env.VITE_AUTH0_AUDIENCE}});setAuthToken(token);await api.post('/api/v1/auth/admin-session/end')}catch{sessionStorage.setItem('foodinka_session_end_pending','true')}sessionStorage.removeItem('foodinka_authenticated');logout({logoutParams:{returnTo:window.location.origin}})}}><LogOut size={16}/>Cerrar sesión</button></div></aside><main className="dashboard-main"><header className="dashboard-topbar"><h1 className="dashboard-section-title">{section==='analytics'?'Ingresos y restaurantes':'Pagos a restaurantes'}</h1><div className="dashboard-user">{user?.name}</div></header><div className="dashboard-content">{section==='analytics'?<Analytics/>:<Payouts/>}</div></main></div>
}
