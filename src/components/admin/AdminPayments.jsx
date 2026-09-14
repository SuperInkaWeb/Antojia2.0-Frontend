import { useState } from 'react'
import AdminTable, { AdminTableFilter, AdminTablePagination, StatusBadge } from './AdminTable.jsx'
import { useAdminPayments, useAdminPaymentSummary } from '../../hooks/useAdmin.js'
import './AdminSection.css'

const STATUS_MAP = {
  PENDING:  { label: 'Pendiente', bg: '#fffbeb', color: '#b45309' },
  PAID:     { label: 'Pagado',    bg: '#f0fdf4', color: '#16a34a' },
  FAILED:   { label: 'Fallido',   bg: '#fef2f2', color: '#dc2626' },
  REFUNDED: { label: 'Devuelto',  bg: '#f5f3ff', color: '#7c3aed' },
}

const METHOD_MAP = {
  MERCADOPAGO:      '💳 Mercado Pago',
  YAPE:             '📱 Yape',
  CASH_ON_DELIVERY: '💵 Efectivo',
}

const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([v, { label }]) => ({ value: v, label }))

export default function AdminPayments() {
  const [status, setStatus] = useState('')
  const [page,   setPage]   = useState(1)
  const { data, isLoading } = useAdminPayments({ status, method: 'MERCADOPAGO', page, limit: 15 })
  const { data: summaryResponse, isLoading: summaryLoading } = useAdminPaymentSummary()
  const summary = summaryResponse?.data

  const columns = [
    { key: 'order',   label: '#Pedido', width: 120, render: p => (
      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#6366f1', fontWeight: 700 }}>
        {p.order?.orderNumber?.slice(-8)}
      </span>
    )},
    { key: 'user',    label: 'Cliente',    render: p => p.order?.user?.name || '—' },
    { key: 'rest',    label: 'Restaurante',render: p => p.order?.restaurant?.name || '—' },
    { key: 'method',  label: 'Método',  width: 120, render: p => METHOD_MAP[p.method] || p.method },
    { key: 'amount',  label: 'Monto',   width: 90,  render: p => `S/ ${p.amount?.toFixed(2)}` },
    { key: 'status',  label: 'Estado',  width: 110, render: p => <StatusBadge status={p.status} map={STATUS_MAP} /> },
    { key: 'date',    label: 'Fecha',   width: 100, render: p => new Date(p.createdAt).toLocaleDateString('es-PE') },
  ]

  return (
    <div className="admin-section">
      <div className="admin-money-grid">
        {[
          ['Hoy', summary?.today], ['Esta semana', summary?.week], ['Este mes', summary?.month],
          ['Este año', summary?.year], ['Total recibido', summary?.lifetime],
        ].map(([label, value]) => <article className="admin-money-card" key={label}>
          <span>{label}</span><strong>{summaryLoading ? '…' : `S/ ${Number(value || 0).toFixed(2)}`}</strong>
          {label === 'Total recibido' && <small>{summary?.count || 0} pagos Mercado Pago confirmados</small>}
        </article>)}
      </div>
      <article className="admin-money-card admin-money-card--test">
        <span>Pagos de prueba Mercado Pago · no cobrados</span>
        <strong>{summaryLoading ? '…' : `S/ ${Number(summary?.testMonth || 0).toFixed(2)}`}</strong>
        <small>{summary?.testCount || 0} pagos sandbox confirmados en total</small>
      </article>
      <div className="admin-section-toolbar">
        <AdminTableFilter value={status} onChange={v => { setStatus(v); setPage(1) }} options={STATUS_OPTIONS} placeholder="Todos los estados" />
      </div>
      <AdminTable columns={columns} data={data?.data} isLoading={isLoading} emptyMsg="No hay pagos" />
      <AdminTablePagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
    </div>
  )
}
