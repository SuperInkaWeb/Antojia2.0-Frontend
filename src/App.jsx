import { Routes, Route } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useRef } from 'react'
import { useOnboarding } from './hooks/useOnboarding.js'
import Home                from './pages/Home.jsx'
import Callback            from './pages/Callback.jsx'
import RestaurantDetail    from './pages/RestaurantDetail.jsx'
import Cart                from './pages/Cart.jsx'
import Checkout            from './pages/Checkout.jsx'
import Onboarding          from './pages/Onboarding.jsx'
import Dashboard           from './pages/admin/Dashboard.jsx'
import BecomeDriver        from './pages/BecomeDriver.jsx'
import DriverDashboard     from './pages/DriverDashboard.jsx'
import MyOrders            from './pages/MyOrders.jsx'
import OrderDetail         from './pages/OrderDetail.jsx'
import RestaurantDashboard from './pages/RestaurantDashboard.jsx'
import RestaurantPortal    from './pages/RestaurantPortal.jsx'
import RegisterRestaurant  from './pages/RegisterRestaurant.jsx'
import Profile from './pages/Profile.jsx'
import PaymentResult from './pages/PaymentResult.jsx'
import RegisterAdmin from './pages/RegisterAdmin.jsx'
import RegisterMarketingAdmin from './pages/RegisterMarketingAdmin.jsx'
import MarketingDashboard from './pages/admin/MarketingDashboard.jsx'
import TechDashboard from './pages/admin/TechDashboard.jsx'
import Reports from './pages/Reports.jsx'
import { useCartStore } from './store/cartStore.js'

function AppRoutes() {
  useOnboarding()
  return (
    <Routes>
      <Route path="/"                      element={<Home />} />
      <Route path="/callback"              element={<Callback />} />
      <Route path="/restaurant/:id"        element={<RestaurantDetail />} />
      <Route path="/cart"                  element={<Cart />} />
      <Route path="/checkout"              element={<Checkout />} />
      <Route path="/onboarding"            element={<Onboarding />} />
      <Route path="/admin"                 element={<Dashboard />} />
      <Route path="/admin/register"        element={<RegisterAdmin />} />
      <Route path="/adminMark/register"    element={<RegisterMarketingAdmin />} />
      <Route path="/adminMark"             element={<MarketingDashboard />} />
      <Route path="/adminTec"              element={<TechDashboard />} />
      <Route path="/reports"               element={<Reports />} />
      <Route path="/become-driver"         element={<BecomeDriver />} />
      <Route path="/driver"                element={<DriverDashboard />} />
      <Route path="/orders"                element={<MyOrders />} />
      <Route path="/orders/:id"            element={<OrderDetail />} />
      <Route path="/restaurant-dashboard"  element={<RestaurantPortal />} />
      <Route path="/restaurant-orders"     element={<RestaurantDashboard />} />
      <Route path="/register-restaurant"   element={<RegisterRestaurant />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/payment/success" element={<PaymentResult status="success" />} />
      <Route path="/payment/pending" element={<PaymentResult status="pending" />} />
      <Route path="/payment/failure" element={<PaymentResult status="failure" />} />
    </Routes>
  )
}

export default function App() {
  const { isLoading, isAuthenticated, loginWithRedirect, error } = useAuth0()
  const recoveryStarted = useRef(false)
  const sessionExpected = sessionStorage.getItem('foodinka_authenticated') === 'true'
  const clearCart = useCartStore(state => state.clearCart)

  useEffect(() => {
    // El carrito pertenece a una sesión autenticada; nunca debe quedar
    // visible al cerrar sesión o cambiar de cuenta.
    if (!isLoading && !isAuthenticated) clearCart()
  }, [clearCart, isAuthenticated, isLoading])

  useEffect(() => {
    // El checkout de Mercado Pago en modo prueba se abre en otra pestaña.
    // Zustand persiste el carrito, pero no sincroniza automáticamente el
    // estado en memoria cuando otra pestaña lo modifica.
    const syncCartFromAnotherTab = event => {
      if (event.key === 'antojia-cart') useCartStore.persist.rehydrate()
    }

    window.addEventListener('storage', syncCartFromAnotherTab)
    return () => window.removeEventListener('storage', syncCartFromAnotherTab)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.setItem('foodinka_authenticated', 'true')
      sessionStorage.removeItem('foodinka_recovery_attempted')
      return
    }
    if (error) {
      sessionStorage.removeItem('foodinka_authenticated')
      sessionStorage.removeItem('foodinka_recovery_attempted')
      return
    }
    if (!isLoading && sessionExpected && !recoveryStarted.current && sessionStorage.getItem('foodinka_recovery_attempted') !== 'true') {
      recoveryStarted.current = true
      sessionStorage.setItem('foodinka_recovery_attempted', 'true')
      loginWithRedirect({
        authorizationParams: { prompt: 'none' },
        appState: { returnTo: window.location.pathname + window.location.search },
      }).catch(() => {
        sessionStorage.removeItem('foodinka_authenticated')
        sessionStorage.removeItem('foodinka_recovery_attempted')
      })
    }
  }, [error, isAuthenticated, isLoading, loginWithRedirect, sessionExpected])

  if (isLoading || (!isAuthenticated && sessionExpected && !error)) return <div className="app-session-loading" role="status"><span/>Restaurando tu sesión…</div>
  return <AppRoutes />
}
