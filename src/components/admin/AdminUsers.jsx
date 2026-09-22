import { useState } from 'react'
import AdminTable, { AdminTableSearch, AdminTableFilter, AdminTablePagination, StatusBadge } from './AdminTable.jsx'
import { useAdminUsers, useAdminMutations } from '../../hooks/useAdmin.js'
import './AdminSection.css'

const ROLE_MAP = {
  CONSUMER:         { label: 'Consumidor',  bg: '#eff6ff', color: '#1d4ed8' },
  RESTAURANT_OWNER: { label: 'Restaurante', bg: '#fff7ed', color: '#c2410c' },
  DELIVERY:         { label: 'Repartidor',  bg: '#f5f3ff', color: '#7c3aed' },
  ADMIN:            { label: 'Admin',       bg: '#fef2f2', color: '#dc2626' },
  MARKETING_ADMIN:  { label: 'AdminMark',   bg: '#faf5ff', color: '#7c3aed' },
  TECH_ADMIN:       { label: 'AdminTec',    bg: '#ecfeff', color: '#0e7490' },
  FINANCE_ADMIN:    { label: 'AdminFin',    bg: '#ecfdf5', color: '#047857' },
}

const ROLE_OPTIONS = [
  { value: 'CONSUMER',         label: 'Consumidores' },
  { value: 'RESTAURANT_OWNER', label: 'Restaurantes' },
  { value: 'DELIVERY',         label: 'Repartidores' },
  { value: 'ADMIN',            label: 'Admins' },
  { value: 'MARKETING_ADMIN',  label: 'Admins de marketing' },
  { value: 'TECH_ADMIN',       label: 'Admins técnicos' },
  { value: 'FINANCE_ADMIN',    label: 'Admins financieros' },
]

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [role,   setRole]   = useState('')
  const [page,   setPage]   = useState(1)

  const { data, isLoading } = useAdminUsers({ search, role, page, limit: 15 })
  const { toggleUser }      = useAdminMutations()

  const columns = [
    { key: 'name', label: 'Usuario', render: u => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {u.avatarUrl
          ? <img src={u.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>👤</div>
        }
        <div>
          <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{u.name}</p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af' }}>{u.email}</p>
        </div>
      </div>
    )},
    { key: 'role',   label: 'Rol',     width: 120, render: u => <StatusBadge status={u.role} map={ROLE_MAP} /> },
    { key: 'orders', label: 'Pedidos', width: 80,  render: u => u._count?.orders ?? 0 },
    { key: 'login',  label: 'Login',   width: 80,  render: u => u.auth0Id?.startsWith('google') ? '🔗 Google' : '📧 Email' },
    { key: 'active', label: 'Estado',  width: 90,  render: u => (
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: u.isActive ? '#16a34a' : '#dc2626' }}>
        {u.isActive ? '● Activo' : '● Inactivo'}
      </span>
    )},
    { key: 'actions', label: 'Acciones', width: 100, render: u => (
      u.role !== 'ADMIN' && (
        <button
          className={`atable-action ${u.isActive ? 'atable-action--red' : 'atable-action--green'}`}
          onClick={() => toggleUser.mutate(u.id)}
          disabled={toggleUser.isPending}
        >
          {u.isActive ? 'Suspender' : 'Activar'}
        </button>
      )
    )},
  ]

  return (
    <div className="admin-section">
      <div className="admin-section-toolbar">
        <AdminTableSearch value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Buscar por nombre o email..." />
        <AdminTableFilter value={role} onChange={v => { setRole(v); setPage(1) }} options={ROLE_OPTIONS} placeholder="Todos los roles" />
      </div>
      <AdminTable columns={columns} data={data?.data} isLoading={isLoading} emptyMsg="No hay usuarios" />
      <AdminTablePagination page={page} totalPages={data?.pagination?.totalPages} onChange={setPage} />
    </div>
  )
}
