// Tabla genérica reutilizable para todas las secciones del admin
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Fragment } from 'react'
import './AdminTable.css'

export function AdminTableSearch({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="atable-search">
      <Search size={15} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export function AdminTableFilter({ value, onChange, options, placeholder }) {
  return (
    <select className="atable-filter" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function AdminTablePagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="atable-pagination">
      <button
        className="atable-page-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="atable-page-info">Página {page} de {totalPages}</span>
      <button
        className="atable-page-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export function StatusBadge({ status, map }) {
  const cfg = map[status] || { label: status, color: '#9ca3af', bg: '#f3f4f6' }
  return (
    <span className="atable-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

export default function AdminTable({ columns, data, isLoading, emptyMsg = 'Sin resultados', expandedRowId, renderExpandedRow }) {
  if (isLoading) return (
    <div className="atable-wrap">
      <div className="atable-loading">
        {[1,2,3,4,5].map(i => <div key={i} className="atable-loading-row" />)}
      </div>
    </div>
  )

  if (!data || data.length === 0) return (
    <div className="atable-empty">{emptyMsg}</div>
  )

  return (
    <div className="atable-wrap">
      <table className="atable">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ width: col.width }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <Fragment key={row.id || i}>
              <tr key={row.id || i}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
              {renderExpandedRow && expandedRowId === row.id && (
                <tr className="atable-expanded-row" key={`${row.id || i}-expanded`}>
                  <td colSpan={columns.length}>{renderExpandedRow(row)}</td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
