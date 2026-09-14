import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Store, Users, ShoppingBag, CreditCard, Bike, LogOut, ChefHat, Wallet } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'
import './AdminSidebar.css'

const ICONS = {
  metrics:     LayoutDashboard,
  restaurants: Store,
  users:       Users,
  orders:      ShoppingBag,
  payments:    CreditCard,
  settlements: Wallet,
  drivers:     Bike,
}

export default function AdminSidebar({ active, onChange, sections }) {
  const { logout } = useAuth0()
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
          onClick={() => {
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
