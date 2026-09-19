import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ShieldAlert } from 'lucide-react'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'
import AdminMetrics from '../../components/admin/AdminMetrics.jsx'
import AdminRestaurants from '../../components/admin/AdminRestaurants.jsx'
import AdminUsers from '../../components/admin/AdminUsers.jsx'
import AdminOrders from '../../components/admin/AdminOrders.jsx'
import AdminPayments from '../../components/admin/AdminPayments.jsx'
import AdminRestaurantPayouts from '../../components/admin/AdminRestaurantPayouts.jsx'
import AdminDrivers from '../../components/admin/AdminDrivers.jsx'
import AdminAdministrators from '../../components/admin/AdminAdministrators.jsx'
import TechAdminInvites from '../../components/admin/TechAdminInvites.jsx'
import './Dashboard.css'
import { useCurrentUser } from '../../hooks/useCurrentUser.js'

const SECTIONS = {
  metrics:     { label: 'Dashboard',     component: AdminMetrics },
  restaurants: { label: 'Restaurantes',  component: AdminRestaurants },
  users:       { label: 'Usuarios',      component: AdminUsers },
  orders:      { label: 'Pedidos',       component: AdminOrders },
  payments:    { label: 'Pagos',         component: AdminPayments },
  settlements: { label: 'Pagos a restaurantes', component: AdminRestaurantPayouts },
  drivers:     { label: 'Repartidores',  component: AdminDrivers },
  administrators: { label: 'Administradores', component: AdminAdministrators },
  techAdministrators: { label: 'Administradores técnicos', component: TechAdminInvites },
}

export default function Dashboard() {
  const { user, isLoading, isAuthenticated, loginWithRedirect } = useAuth0()
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const [active, setActive] = useState('metrics')

  if (isLoading || (isAuthenticated && userLoading)) return <div className="dashboard-loading">Cargando...</div>

  const loginAsAdmin = () => loginWithRedirect({
    authorizationParams: { prompt: 'login' },
    appState: { returnTo: '/admin/register' },
  })

  if (!isAuthenticated || currentUser?.role !== 'ADMIN') {
    return <div className="dashboard-loading" style={{ minHeight: '100vh', flexDirection: 'column', gap: 14 }}>
      <ShieldAlert size={46} color="#dc2626" strokeWidth={1.5}/>
      <strong>No tienes acceso al panel de administrador</strong>
      <span>Inicia sesión con el correo autorizado como administrador.</span>
      <button className="dashboard-login-admin" onClick={loginAsAdmin}>Iniciar sesión como administrador</button>
    </div>
  }

  const Section = SECTIONS[active]?.component || AdminMetrics

  return (
    <div className="dashboard">
      <AdminSidebar active={active} onChange={setActive} sections={SECTIONS} />
      <main className="dashboard-main">
        <div className="dashboard-topbar">
          <h1 className="dashboard-section-title">
            {SECTIONS[active]?.label}
          </h1>
          <div className="dashboard-user">
            {user?.picture && <img src={user.picture} alt={user.name} />}
            <span>{user?.name}</span>
          </div>
        </div>
        <div className="dashboard-content">
          <Section />
        </div>
      </main>
    </div>
  )
}
