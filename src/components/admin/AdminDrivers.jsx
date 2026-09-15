import { useState } from 'react'
import AdminTable, { AdminTableFilter, AdminTablePagination, StatusBadge } from './AdminTable.jsx'
import { useAdminDrivers, useAdminMutations } from '../../hooks/useAdmin.js'
import './AdminSection.css'

const STATUS_MAP = {
  OFFLINE:    { label: 'Offline',      bg: '#f3f4f6', color: '#6b7280' },
  AVAILABLE:  { label: 'Disponible',   bg: '#f0fdf4', color: '#16a34a' },
  ON_DELIVERY:{ label: 'En entrega',   bg: '#eff6ff', color: '#1d4ed8' },
  SUSPENDED:  { label: 'Suspendido',   bg: '#fef2f2', color: '#dc2626' },
}

const STATUS_OPTIONS = Object.entries(STATUS_MAP).map(([v, { label }]) => ({ value: v, label }))
const VERIFIED_OPTIONS = [{ value: 'true', label: 'Verificados' }, { value: 'false', label: 'Sin verificar' }]

const VEHICLE_ICONS = { MOTORCYCLE: '🏍️', BICYCLE: '🚲', CAR: '🚗', ON_FOOT: '🚶' }

export default function AdminDrivers() {
  const [status,     setStatus]     = useState('')
  const [isVerified, setIsVerified] = useState('')
  const [page,       setPage]       = useState(1)
  const { data, isLoading } = useAdminDrivers({ status, isVerified, page, limit: 15 })
  const { verifyDriver, suspendDriver, activateDriver } = useAdminMutations()

  const columns = [
    { key: 'user',    label: 'Repartidor', render: d => (
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{d.user?.name}</p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>{d.user?.email}</p>
      </div>
    )},
    { key: 'vehicle', label: 'Vehículo', width: 110, render: d => `${VEHICLE_ICONS[d.vehicleType] || ''} ${d.vehicleType}` },
    { key: 'dni',     label: 'DNI',      width: 90,  render: d => d.dni || '—' },
    { key: 'plate',   label: 'Placa',    width: 90,  render: d => d.licensePlate || '—' },
    { key: 'verified',label: 'Verificado', width: 100, render: d => (
      <span style={{ fontWeight: 700, color: d.isVerified ? '#16a34a' : '#b45309' }}>
        {d.isVerified ? '✅ Sí' : '⏳ No'}
      </span>
    )},
    { key: 'deliveries', label: 'Entregas', width: 80, render: d => d.totalDeliveries },
    { key: 'status',  label: 'Estado', width: 110, render: d => <StatusBadge status={d.status} map={STATUS_MAP} /> },
    { key: 'actions', label: 'Acciones', width: 160, render: d => (
      <div style={{ display: 'flex', gap: 6 }}>
        {!d.isVerified && (
          <button
            className="atable-action atable-action--green"
            onClick={() => verifyDriver.mutate(d.id)}
            disabled={verifyDriver.isPending}
          >Verificar</button>
        )}
        {d.status !== 'SUSPENDED' && (
          <button
            className="atable-action atable-action--red"
            onClick={() => suspendDriver.mutate(d.id)}
            disabled={suspendDriver.isPending}
          >Suspender</button>
        )}
        {d.status === 'SUSPENDED' && (
          <button
            className="atable-action atable-action--green"
            onClick={() => activateDriver.mutate(d.id)}
            disabled={activateDriver.isPending}
          >Activar</button>
        )}
      </div>
    )},
  ]

  return (
    <div className="admin-section">
      <div className="admin-section-toolbar">
        <AdminTableFilter value={status}     onChange={v => { setStatus(v);     setPage(1) }} options={STATUS_OPTIONS}   placeholder="Todos los estados" />
        <AdminTableFilter value={isVerified} onChange={v => { setIsVerified(v); setPage(1) }} options={VERIFIED_OPTIONS} placeholder="Verificación" />
      </div>
      <AdminTable columns={columns} data={data?.data} isLoading={isLoading} emptyMsg="No hay repartidores" />
      <AdminTablePagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
    </div>
  )
}
