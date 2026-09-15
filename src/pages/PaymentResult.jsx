import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import Navbar from '../components/layout/Navbar.jsx'
import { useCartStore } from '../store/cartStore.js'
import './PaymentResult.css'

// Página de retorno de Mercado Pago (Checkout Pro).
// `status` es el "tipo de ruta" por la que MP redirigió (success/pending/failure),
// pero la verdad de fondo siempre se obtiene sincronizando con el backend —
// MP puede redirigir a "success" y que el pago siga en revisión, por ejemplo.
export default function PaymentResult({ status }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const api = useApi()
  const removePurchasedItems = useCartStore(state => state.removePurchasedItems)

  const orderId    = searchParams.get('orderId')
  const mpPaymentId = searchParams.get('payment_id') || searchParams.get('collection_id')

  const [syncing, setSyncing] = useState(true)
  const [payment, setPayment] = useState(null)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false

    async function sync() {
      if (!orderId) {
        setError('No se encontró el pedido a sincronizar')
        setSyncing(false)
        return
      }
      try {
        // El webhook puede llegar unos segundos después de la redirección.
        // Reintentamos para no dejar carrito/pedido en estado pendiente.
        for (let attempt = 0; attempt < 6 && !cancelled; attempt += 1) {
          const { data } = await api.post('/api/v1/payments/mercadopago/sync', {
            orderId,
            mpPaymentId,
            result: status,
          })
          if (!cancelled) setPayment(data.data)
          if (data.data?.status === 'PAID' || data.data?.status === 'FAILED') break
          if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || 'No se pudo verificar el pago')
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    sync()
    return () => { cancelled = true }
  }, [api, mpPaymentId, orderId, status])

  const finalStatus = payment?.status || (status === 'failure' ? 'FAILED' : 'PENDING')
  useEffect(() => {
    if (finalStatus !== 'PAID' || !orderId) return

    const key = `antojia-pending-payment-${orderId}`
    try {
      const purchasedItems = JSON.parse(localStorage.getItem(key) || 'null')
      if (Array.isArray(purchasedItems)) removePurchasedItems(purchasedItems)
      localStorage.removeItem(key)
    } catch {
      localStorage.removeItem(key)
    }
  }, [finalStatus, orderId, removePurchasedItems])

  // Mientras sincronizamos, mostrar spinner — esto cubre el caso típico de
  // desarrollo local donde el webhook de MP todavía no llegó.
  if (syncing) {
    return (
      <div className="payresult">
        <Navbar />
        <div className="payresult-card">
          <Loader2 size={40} className="payresult-spin" />
          <h1>Verificando tu pago...</h1>
          <p>Esto puede tardar unos segundos.</p>
        </div>
      </div>
    )
  }

  const view = {
    PAID: {
      icon: <CheckCircle size={56} color="#16a34a" />,
      title: '¡Pago exitoso! 🎉',
      desc: 'Tu pedido fue confirmado y el restaurante ya lo está preparando.',
    },
    PENDING: {
      icon: <Clock size={56} color="#b45309" />,
      title: 'Pago en proceso',
      desc: 'Mercado Pago todavía está confirmando tu pago. Te avisaremos cuando se acredite — puedes revisar el estado en tu pedido.',
    },
    FAILED: {
      icon: <XCircle size={56} color="#dc2626" />,
      title: 'El pago no se pudo procesar',
      desc: 'No te preocupes, no se realizó ningún cargo. Puedes intentar de nuevo con otro medio de pago.',
    },
  }[finalStatus] || {
    icon: <Clock size={56} color="#b45309" />,
    title: 'Estado del pago desconocido',
    desc: error || 'Revisa el estado de tu pedido más adelante.',
  }

  return (
    <div className="payresult">
      <Navbar />
      <div className="payresult-card">
        {view.icon}
        <h1>{view.title}</h1>
        <p>{view.desc}</p>

        <div className="payresult-actions">
          {orderId && (
            <button className="payresult-btn payresult-btn--primary" onClick={() => navigate(`/orders/${orderId}`)}>
              Ver mi pedido
            </button>
          )}
          {finalStatus === 'FAILED' && (
            <button className="payresult-btn" onClick={() => navigate('/cart')}>
              Volver al carrito
            </button>
          )}
          <button className="payresult-btn" onClick={() => navigate('/')}>
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
