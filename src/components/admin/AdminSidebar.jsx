import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Store, Users, ShoppingBag, CreditCard, Bike, LogOut, ChefHat, Wallet, ShieldCheck } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'
import './AdminSidebar.css'
import { api, setAuthToken } from '../../config/api.js'

const ICONS = {
  metrics:     LayoutDashboard,
  restaurants: Store,
  users:       Users,
  orders:      ShoppingBag,
  payments:    CreditCard,
  settlements: Wallet,
  drivers:     Bike,
  administrators: ShieldCheck,
  techAdministrators: ShieldCheck,
}

export default function AdminSidebar({ active, onChange, sections }) {
  const { logout, getAccessTokenSilently } = useAuth0()
  const navigate   = useNavigate()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo" onClick={() => navigate('/')}>
        <ChefHat size={22} />
        <span>Antojia</span>
        <small>Admin</small>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {Object.entries(sections).map(([key, { label }]) => {
          const Icon = ICONS[key] || LayoutDashboard
          return (
            <button
              key={key}
              className={`sidebar-item ${active === key ? 'sidebar-item--active' : ''}`}
              onClick={() => onChange(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="sidebar-logout"
          onClick={async () => {
            try {
              const token = await getAccessTokenSilently({ authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE } })
              setAuthToken(token)
              await api.post('/api/v1/auth/admin-session/end')
            } catch { /* El cierre de Auth0 debe continuar aunque falle el registro. */ }
            sessionStorage.removeItem('foodinka_authenticated')
            sessionStorage.removeItem('foodinka_recovery_attempted')
            logout({ logoutParams: { returnTo: window.location.origin } })
          }}
        >
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
