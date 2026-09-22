// src/components/layout/Navbar.jsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import {
  ShoppingCart, Menu, X, User, LogOut,
  LayoutDashboard, Bike, Store, UtensilsCrossed, ArrowRight, MapPin, Search,
} from 'lucide-react'
import { useCartStore } from '../../store/cartStore.js'
import { useCurrentUser } from '../../hooks/useCurrentUser.js'
import './Navbar.css'

export default function Navbar({ cartCount, searchValue = '', onSearchChange, district = 'Lima' }) {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0()
  const { data: dbUser } = useCurrentUser()
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const navigate   = useNavigate()
  const totalItems = useCartStore(s => s.getTotalItems())
  const count      = cartCount ?? totalItems
  const clearCart  = useCartStore(s => s.clearCart)

  const role              = dbUser?.role || null
  const isAdmin           = role === 'ADMIN'
  const isMarketingAdmin  = role === 'MARKETING_ADMIN'
  const isTechAdmin       = role === 'TECH_ADMIN'
  const isFinanceAdmin    = role === 'FINANCE_ADMIN'
  const isDriver          = role === 'DELIVERY'
  const isRestaurantOwner = role === 'RESTAURANT_OWNER'
  const isConsumer        = isAuthenticated && !isAdmin && !isMarketingAdmin && !isTechAdmin && !isFinanceAdmin && !isDriver && !isRestaurantOwner
  const logoDestination   = isDriver ? '/driver' : '/'

  const handleLogout = () => {
    clearCart()
    sessionStorage.removeItem('foodinka_authenticated')
    sessionStorage.removeItem('foodinka_recovery_attempted')
    logout({ logoutParams: { returnTo: window.location.origin } })
  }

  const go = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  const registerAs = (returnTo) => {
    setRegisterOpen(false)
    setMenuOpen(false)
    sessionStorage.setItem('foodinka_registration_target', returnTo)
    loginWithRedirect({
      authorizationParams: { screen_hint: 'signup' },
      appState: { returnTo },
    })
  }

  const loginAs = (role) => {
    setLoginOpen(false)
    setMenuOpen(false)
    sessionStorage.setItem('foodinka_login_role', role)
    loginWithRedirect({ appState: { returnTo: '/' } })
  }

  useEffect(() => {
    if (!menuOpen) return undefined

    const closeOnEscape = event => event.key === 'Escape' && setMenuOpen(false)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <nav className="navbar">
      <div className={`navbar-inner ${!isAuthenticated ? 'navbar-inner--guest' : ''}`}>

        {isAuthenticated && (
          <button
            type="button"
            className="navbar-consumer-menu"
            onClick={() => setMenuOpen(open => !open)}
            aria-label={menuOpen ? 'Cerrar menú de usuario' : 'Abrir menú de usuario'}
            aria-expanded={menuOpen}
            aria-controls="consumer-menu"
          >
            <Menu size={23} />
          </button>
        )}

        {/* Logo imagen */}
        <Link to={logoDestination} className="navbar-logo">
          <img
            src="/logo.jpeg"
            alt="Antojia"
            className="navbar-logo-img"
          />
        </Link>

        <button className="navbar-location" type="button">
          <MapPin size={19}/><span><small>Entregar en</small><strong>{district}</strong></span>
        </button>

        {onSearchChange && <label className="navbar-search"><Search size={18}/><input value={searchValue} onChange={event => onSearchChange(event.target.value)} placeholder="Busca restaurantes o platos"/></label>}

        {/* Acciones desktop */}
        <div className={`navbar-actions ${!isAuthenticated ? 'navbar-actions--guest' : ''}`}>
          {isConsumer && <button className="navbar-orders" onClick={() => go('/orders')}>Mis pedidos</button>}
          {(!isAuthenticated || isConsumer) && (
            <Link to="/cart" className="navbar-cart">
              <ShoppingCart size={20} />
              <span className="navbar-cart-label">Carrito</span>
              {count > 0 && <span className="navbar-cart-badge">{count}</span>}
            </Link>
          )}

          {!isAuthenticated && (
            <div className="navbar-auth-actions">
              <button className="navbar-btn-register" onClick={() => setRegisterOpen(true)}>Registrarse</button>
              <button className="navbar-btn-login" onClick={() => setLoginOpen(true)}>Iniciar sesión</button>
            </div>
          )}

        </div>

        {/* Hamburguesa mobile */}
        {!isAuthenticated && (
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(m => !m)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú de usuario'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>

      {/* Menú mobile */}
      {menuOpen && (
        <div className="navbar-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <aside id="consumer-menu" className="navbar-mobile" onClick={event => event.stopPropagation()}>
          <div className="navbar-drawer-head">
            <div>
              <small>{isAuthenticated ? 'Mi cuenta' : 'Menú'}</small>
              <strong>{isAuthenticated ? (user?.name || 'Usuario') : 'Antójia'}</strong>
              {isAuthenticated && <span>{user?.email}</span>}
            </div>
            <button onClick={() => setMenuOpen(false)} aria-label="Cerrar"><X size={19}/></button>
          </div>
          <nav className="navbar-drawer-links">
          {!isDriver && <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>}
          {!isAuthenticated
            ? <>
                <Link to="/cart" onClick={() => setMenuOpen(false)}>Carrito {count > 0 && `(${count})`}</Link>
                <button onClick={() => { setMenuOpen(false); setRegisterOpen(true) }}>Registrarse</button>
                <button onClick={() => { setMenuOpen(false); setLoginOpen(true) }}>Iniciar sesión</button>
              </>
            : <>
                {isConsumer && <>
                  <Link to="/cart" onClick={() => setMenuOpen(false)}>Carrito {count > 0 && `(${count})`}</Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>Mi perfil</Link>
                  <Link to="/orders" onClick={() => setMenuOpen(false)}>Mis pedidos y seguimiento</Link>
                  <Link to="/reports" onClick={() => setMenuOpen(false)}>Reportes</Link>
                </>}
                {isRestaurantOwner && (
                  <><Link to="/restaurant-dashboard" onClick={() => setMenuOpen(false)}>Dashboard del restaurante</Link><Link to="/reports" onClick={() => setMenuOpen(false)}>Reportes</Link></>
                )}
                {isDriver && (
                  <>
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>Mi perfil</Link>
                    <Link to="/driver" onClick={() => setMenuOpen(false)}>Panel de delivery</Link>
                    <Link to="/reports" onClick={() => setMenuOpen(false)}>Reportes</Link>
                  </>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)}>Dashboard del administrador</Link>
                )}
                {isMarketingAdmin && <Link to="/adminMark" onClick={() => setMenuOpen(false)}>Dashboard de marketing</Link>}
                {isTechAdmin && <Link to="/adminTec" onClick={() => setMenuOpen(false)}>Dashboard de reportes</Link>}
                {isFinanceAdmin && <Link to="/adminFin" onClick={() => setMenuOpen(false)}>Dashboard financiero</Link>}
                <button className="navbar-drawer-logout" onClick={handleLogout}><LogOut size={16}/> Cerrar sesión</button>
              </>
          }
          </nav>
          </aside>
        </div>
      )}

      {registerOpen && (
        <div className="register-choice-overlay" onClick={event => event.target === event.currentTarget && setRegisterOpen(false)}>
          <div className="register-choice-modal" role="dialog" aria-modal="true" aria-labelledby="register-choice-title">
            <button className="register-choice-close" onClick={() => setRegisterOpen(false)} aria-label="Cerrar"><X size={19} /></button>
            <span className="register-choice-kicker">Únete a Foodinka</span>
            <h2 id="register-choice-title">¿Cómo quieres registrarte?</h2>
            <p>Escoge el perfil que mejor describe lo que quieres hacer.</p>
            <div className="register-choice-grid">
              <button onClick={() => registerAs('/')}>
                <span className="register-choice-icon"><User size={22} /></span>
                <span><strong>Consumidor</strong><small>Cliente para pedir comida y reservar mesas.</small></span>
                <ArrowRight size={17} />
              </button>
              <button onClick={() => registerAs('/register-restaurant')}>
                <span className="register-choice-icon"><UtensilsCrossed size={22} /></span>
                <span><strong>Restaurante</strong><small>Publica tu menú y gestiona ventas.</small></span>
                <ArrowRight size={17} />
              </button>
              <button onClick={() => registerAs('/become-driver')}>
                <span className="register-choice-icon"><Bike size={22} /></span>
                <span><strong>Repartidor</strong><small>Regístrate para realizar entregas.</small></span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {loginOpen && (
        <div className="register-choice-overlay" onClick={event => event.target === event.currentTarget && setLoginOpen(false)}>
          <div className="register-choice-modal" role="dialog" aria-modal="true" aria-labelledby="login-choice-title">
            <button className="register-choice-close" onClick={() => setLoginOpen(false)} aria-label="Cerrar"><X size={19} /></button>
            <span className="register-choice-kicker">Bienvenido de vuelta</span>
            <h2 id="login-choice-title">¿Cómo quieres ingresar?</h2>
            <p>Elige el tipo de cuenta. Validaremos el acceso con el rol registrado en tu sesión.</p>
            <div className="register-choice-grid">
              <button onClick={() => loginAs('CONSUMER')}><span className="register-choice-icon"><User size={22} /></span><span><strong>Consumidor</strong><small>Para pedir comida o reservar una mesa.</small></span><ArrowRight size={17} /></button>
              <button onClick={() => loginAs('RESTAURANT_OWNER')}><span className="register-choice-icon"><UtensilsCrossed size={22} /></span><span><strong>Restaurante</strong><small>Para gestionar tu restaurante.</small></span><ArrowRight size={17} /></button>
              <button onClick={() => loginAs('DELIVERY')}><span className="register-choice-icon"><Bike size={22} /></span><span><strong>Repartidor</strong><small>Para ver y tomar pedidos disponibles.</small></span><ArrowRight size={17} /></button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
