import { useMemo, useState } from 'react'
import { Building2, CircleDollarSign, Landmark, Wallet } from 'lucide-react'
import { useAdminMutations, useAdminSettlements } from '../../hooks/useAdmin.js'
import './AdminSection.css'

const money = value => `S/ ${Number(value || 0).toFixed(2)}`
const date = value => new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
const EMPTY_RESTAURANTS = []

export default function AdminRestaurantPayouts() {
  const { data: response, isLoading } = useAdminSettlements()
  const { updateCommission, creditRestaurant, markWithdrawalPaid } = useAdminMutations()
  const settlements = response?.data
  const restaurants = settlements?.restaurants || EMPTY_RESTAURANTS
  const [selectedId, setSelectedId] = useState('')
  const [references, setReferences] = useState({})
  const selected = useMemo(() => restaurants.find(item => item.id === selectedId) || restaurants[0], [restaurants, selectedId])

  const setRate = event => updateCommission.mutate(Number(event.target.value))
  const confirmTransfer = id => {
    if (!String(references[id] || '').trim()) return
    markWithdrawalPaid.mutate({ id, transferReference: references[id].trim() })
  }

  if (isLoading) return <div className="admin-section"><p>Cargando liquidaciones…</p></div>

  return <div className="admin-section">
    <section className="settlement-rate-card">
      <div><span className="settlement-eyebrow">Comisión de plataforma</span><h2>Porcentaje para nuevas liquidaciones</h2><p>Se calcula sobre los productos pagados, descontando promociones y sin incluir delivery. Las liquidaciones anteriores conservan su tasa.</p></div>
      <label>Comisión <select value={settlements?.commissionPercent ?? 20} onChange={setRate} disabled={updateCommission.isPending}>{Array.from({ length: 21 }, (_, i) => i + 20).map(value => <option key={value} value={value}>{value}%</option>)}</select></label>
    </section>

    <div className="settlement-layout">
      <section className="settlement-list-card">
        <div className="settlement-section-title"><Building2 size={18}/><h2>Restaurantes</h2><span>{restaurants.length}</span></div>
        {restaurants.length === 0 ? <p className="settlement-empty">Todavía no hay restaurantes registrados.</p> : restaurants.map(restaurant => <button type="button" key={restaurant.id} onClick={() => setSelectedId(restaurant.id)} className={`settlement-restaurant ${selected?.id === restaurant.id ? 'active' : ''}`}>
          <span className="settlement-restaurant-logo">{restaurant.logoUrl ? <img src={restaurant.logoUrl} alt=""/> : <Building2 size={18}/>}</span>
          <span className="settlement-restaurant-name"><strong>{restaurant.name}</strong><small>{restaurant.owner?.name || restaurant.district || restaurant.status}</small></span>
          <b>{money(restaurant.pendingCredit)}</b>
        </button>)}
      </section>

      {selected && <section className="settlement-detail-card">
        <div className="settlement-section-title"><Wallet size={18}/><h2>{selected.name}</h2></div>
        <p className="settlement-owner">{selected.owner?.name} · {selected.owner?.email}</p>
        <div className="settlement-breakdown">
          <div><span>Ventas pagadas</span><strong>{money(selected.salesTotal)}</strong></div>
          <div><span>Ventas por liquidar</span><strong>{money(selected.pendingSales)}</strong></div>
          <div><span>Porcentaje admin ({settlements?.commissionPercent}%)</span><strong>{money(selected.adminEarnedTotal)}</strong></div>
          <div><span>Ganancia del restaurante</span><strong>{money(selected.restaurantEarnedTotal)}</strong></div>
          <div className="settlement-wallet"><span>Saldo disponible para retiro</span><strong>{money(selected.walletBalance)}</strong></div>
        </div>
        <button className="settlement-primary" disabled={creditRestaurant.isPending || selected.pendingSales < 0.01} onClick={() => creditRestaurant.mutate(selected.id)}>
          <CircleDollarSign size={17}/>{creditRestaurant.isPending ? 'Acreditando…' : 'Pagar restaurante'}
        </button>
        <small className="settlement-note">Acredita el neto a su saldo. La transferencia bancaria se realiza aparte cuando el restaurante solicita un retiro.</small>
        <h3 className="settlement-subtitle">Últimas liquidaciones</h3>
        {selected.payouts.length === 0 ? <p className="settlement-empty">Aún no se han acreditado liquidaciones.</p> : <div className="settlement-ledger">{selected.payouts.slice(0, 5).map((payout, index) => <div key={`${payout.createdAt}-${index}`}><span>{date(payout.createdAt)} · {payout.commissionPercent}% comisión</span><b>{money(payout.netAmount)} al restaurante</b></div>)}</div>}
      </section>}
    </div>

    <section className="settlement-requests-card">
      <div className="settlement-section-title"><Landmark size={18}/><h2>Solicitudes de retiro</h2><span>{settlements?.withdrawalRequests?.length || 0}</span></div>
      {!settlements?.withdrawalRequests?.length ? <p className="settlement-empty">No hay retiros pendientes.</p> : <div className="settlement-requests">{settlements.withdrawalRequests.map(request => <article key={request.id} className="settlement-request">
        <div className="settlement-request-head"><div><strong>{request.restaurant.name}</strong><small>{date(request.createdAt)}</small></div><b>{money(request.amount)}</b></div>
        <p><b>{request.bankName}</b> · {request.accountHolder} · {request.destinationAccountMasked}</p>
        <div className="settlement-bank-detail">{request.bankDetails.accountNumber && <span>Cuenta: {request.bankDetails.accountNumber}</span>}{request.bankDetails.cci && <span>CCI: {request.bankDetails.cci}</span>}<small>Datos visibles solo para procesar este retiro.</small></div>
        <div className="settlement-transfer-row"><input aria-label="Número de operación bancaria" value={references[request.id] || ''} onChange={event => setReferences(current => ({ ...current, [request.id]: event.target.value }))} placeholder="N.º de operación bancaria"/><button disabled={markWithdrawalPaid.isPending || !String(references[request.id] || '').trim()} onClick={() => confirmTransfer(request.id)}>Marcar como transferido</button></div>
      </article>)}</div>}
    </section>
  </div>
}
