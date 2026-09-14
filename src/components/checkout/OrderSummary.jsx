import { Loader2 } from 'lucide-react'
import './OrderSummary.css'

const TYPE_LABELS = {
  DELIVERY:    '🛵 Delivery',
  RESERVATION: '📅 Reserva en local',
}

export default function OrderSummary({
  items, restaurantName, subtotal,
  orderType, paymentConfig, onConfirm, loading,
}) {
  return (
    <div className="osummary">
      <h2 className="osummary-title">Resumen del pedido</h2>

      {/* Restaurante */}
      <p className="osummary-restaurant">{restaurantName}</p>

      {/* Items */}
      <div className="osummary-items">
        {items.map(item => {
          const price = item.product.finalPrice ?? item.product.price
          return (
            <div key={item.product.id} className="osummary-item">
              <span className="osummary-item-qty">{item.quantity}×</span>
              <span className="osummary-item-name">{item.product.name}</span>
              <span className="osummary-item-price">
                S/ {(price * item.quantity).toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="osummary-divider" />

      {/* Tipo y pago */}
      <div className="osummary-meta">
        <div className="osummary-meta-row">
          <span>Tipo</span>
          <span>{TYPE_LABELS[orderType]}</span>
        </div>
        <div className="osummary-meta-row">
          <span>Pago</span>
          <span>💳 Mercado Pago</span>
        </div>
      </div>

      <div className="osummary-divider" />

      {/* Totales */}
      <div className="osummary-totals">
        <div className="osummary-row">
          <span>Subtotal</span>
          <span>S/ {subtotal.toFixed(2)}</span>
        </div>
        {orderType === 'DELIVERY' && (
          <div className="osummary-row osummary-row--note">
            <span>Delivery</span>
            <span>Se calcula al confirmar</span>
          </div>
        )}
      </div>

      <div className="osummary-total">
        <span>Total estimado</span>
        <span>S/ {subtotal.toFixed(2)}</span>
      </div>

      {!paymentConfig ? <p className="osummary-test-note">Verificando medios de pago…</p> : <>
        {paymentConfig.productionEnabled && <button
          className="osummary-btn osummary-btn--mercadopago"
          onClick={() => onConfirm('MERCADOPAGO')}
          disabled={loading}
        >
          {loading ? <><Loader2 size={18} className="osummary-spinner" /> Procesando...</> : '💳 Pagar con Mercado Pago'}
        </button>}
        {paymentConfig.testEnabled && <button
          className="osummary-btn osummary-btn--test"
          onClick={() => onConfirm('MERCADOPAGO_TEST')}
          disabled={loading}
        >
          {loading ? <><Loader2 size={18} className="osummary-spinner" /> Procesando...</> : '🧪 Probar pago Mercado Pago'}
        </button>}
        {paymentConfig.productionEnabled && <p className="osummary-test-note">El pago real cobrará el monto mostrado a través de Mercado Pago.</p>}
        {!paymentConfig.productionEnabled && paymentConfig.testEnabled && <p className="osummary-test-note">Solo está habilitado el modo de prueba; no se realizará ningún cobro real.</p>}
        {!paymentConfig.productionEnabled && !paymentConfig.testEnabled && <p className="osummary-test-note">El pago con Mercado Pago no está configurado. Intenta más tarde.</p>}
      </>}
    </div>
  )
}
