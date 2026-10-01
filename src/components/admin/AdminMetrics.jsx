import { createElement, useState } from 'react'
import { Users, Store, ShoppingBag, DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useAdminMutations, useMetrics, useRevenueChart } from '../../hooks/useAdmin.js'
import './AdminMetrics.css'

function StatCard({ icon, label, value, sub, trend, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-card-icon" style={{ background: color + '18', color }}>
          {createElement(icon, { size: 20 })}
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`stat-card-trend ${trend >= 0 ? 'stat-card-trend--up' : 'stat-card-trend--down'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="stat-card-value">{value}</p>
      <p className="stat-card-label">{label}</p>
      {sub && <p className="stat-card-sub">{sub}</p>}
    </div>
  )
}

function formatMoney(value) {
  return `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function monthLabel(month) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
}

function RevenueMonthlyChart({ data }) {
  const [active, setActive] = useState(null)
  if (!data || data.length === 0) return (
    <div className="chart-empty">Sin datos de ingresos aún</div>
  )
  const width = 760
  const height = 330
  const padding = { top: 24, right: 24, bottom: 54, left: 62 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const max = Math.max(...data.map(item => Number(item.revenue || 0)), 1)
  const x = index => data.length === 1 ? padding.left + plotWidth / 2 : padding.left + index * plotWidth / (data.length - 1)
  const y = value => padding.top + plotHeight - (Number(value || 0) / max) * plotHeight
  const points = key => data.map((item, index) => `${x(index)},${y(item[key] || 0)}`).join(' ')
  const grid = [0, 0.25, 0.5, 0.75, 1]
  const activeItem = active === null ? null : data[active]
  return (
    <div className="revenue-line-wrap">
      <div className="revenue-line-legend"><span><i className="revenue-line-key revenue-line-key--total" />Total ganado</span><span><i className="revenue-line-key revenue-line-key--real" />Ganancia real</span><span><i className="revenue-line-key revenue-line-key--test" />Ganancia de prueba</span></div>
      <svg className="revenue-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ganancia del administrador durante los últimos seis meses">
        {grid.map(value => <g key={value}><line className="revenue-line-grid" x1={padding.left} x2={width - padding.right} y1={y(max * value)} y2={y(max * value)} /><text className="revenue-line-axis" x={padding.left - 10} y={y(max * value) + 4} textAnchor="end">{formatMoney(max * value)}</text></g>)}
        <polyline className="revenue-line revenue-line--real" points={points('realRevenue')} />
        <polyline className="revenue-line revenue-line--test" points={points('testRevenue')} />
        <polyline className="revenue-line revenue-line--total" points={points('revenue')} />
        {data.map((item, index) => <g key={item.month} className="revenue-line-point-group" onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} tabIndex="0">
          <line className={active === index ? 'revenue-line-hover-line revenue-line-hover-line--active' : 'revenue-line-hover-line'} x1={x(index)} x2={x(index)} y1={padding.top} y2={height - padding.bottom} />
          <circle className="revenue-line-hit-area" cx={x(index)} cy={y(item.revenue)} r="14" />
          <circle className="revenue-line-point revenue-line-point--total" cx={x(index)} cy={y(item.revenue)} r={active === index ? 6 : 4} />
          <text className="revenue-line-month" x={x(index)} y={height - 24} textAnchor="middle">{monthLabel(item.month)}</text>
        </g>)}
        {activeItem && <g className="revenue-line-tooltip" transform={`translate(${Math.min(Math.max(x(active) - 92, padding.left), width - 210)} ${Math.max(y(activeItem.revenue) - 112, 8)})`}>
          <rect width="184" height="96" rx="10" />
          <text className="revenue-line-tooltip-title" x="14" y="20">{monthLabel(activeItem.month)}</text>
          <text x="14" y="42">Total: <tspan>{formatMoney(activeItem.revenue)}</tspan></text>
          <text x="14" y="62">Real: <tspan>{formatMoney(activeItem.realRevenue)}</tspan></text>
          <text x="14" y="82">Prueba: <tspan>{formatMoney(activeItem.testRevenue)}</tspan></text>
        </g>}
      </svg>
    </div>
  )
}

export default function AdminMetrics() {
  const { data: metrics, isLoading } = useMetrics()
  const { data: chart }              = useRevenueChart()
  const { updateCommission } = useAdminMutations()

  if (isLoading) return (
    <div className="metrics-skeleton">
      {[1,2,3,4].map(i => <div key={i} className="metrics-skeleton-card" />)}
    </div>
  )

  if (!metrics) return null

  return (
    <div className="metrics">

      <section className="metrics-commission-card">
        <div>
          <span className="metrics-commission-eyebrow">Configuración financiera</span>
          <h2>Porcentaje de comisión del administrador</h2>
          <p>Se aplica a las nuevas liquidaciones: el porcentaje elegido es para Foodinka y el resto queda disponible para el restaurante.</p>
        </div>
        <label>Comisión
          <select value={metrics.revenue.commissionPercent} onChange={event => updateCommission.mutate(Number(event.target.value))} disabled={updateCommission.isPending}>
            {Array.from({ length: 21 }, (_, index) => index + 20).map(value => <option key={value} value={value}>{value}%</option>)}
          </select>
        </label>
      </section>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <StatCard
          icon={Users}
          label="Usuarios totales"
          value={metrics.users.total.toLocaleString()}
          color="#6366f1"
        />
        <StatCard
          icon={Store}
          label="Restaurantes registrados"
          value={metrics.restaurants.total}
          sub={`${metrics.restaurants.active} activos · ${metrics.restaurants.pending} pendientes`}
          color="#e85d24"
        />
        <StatCard
          icon={ShoppingBag}
          label="Pedidos este mes"
          value={metrics.orders.thisMonth.toLocaleString()}
          trend={metrics.orders.growth}
          color="#0ea5e9"
        />
        <StatCard
          icon={DollarSign}
          label={`Ganancia admin este mes (${metrics.revenue.commissionPercent}%)`}
          value={`S/ ${metrics.revenue.thisMonth.toLocaleString()}`}
          sub={`${metrics.revenue.paidPayments} pagos este mes · ticket prom histórico: S/ ${metrics.revenue.avgTicket}`}
          trend={metrics.revenue.growth}
          color="#16a34a"
        />
        <StatCard
          icon={DollarSign}
          label="Ganancia admin total"
          value={`S/ ${Number(metrics.revenue.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`Real: S/ ${Number(metrics.revenue.realTotal || 0).toFixed(2)} · Prueba: S/ ${Number(metrics.revenue.testTotal || 0).toFixed(2)}`}
          color="#0f766e"
        />
        <StatCard
          icon={Clock}
          label="Ventas de prueba (no cobradas)"
          value={`S/ ${Number(metrics.revenue.testSalesThisMonth || 0).toLocaleString()}`}
          sub={`${metrics.revenue.testPaymentsThisMonth || 0} pagos sandbox · comisión admin simulada: S/ ${Number(metrics.revenue.testAdminCommissionThisMonth || 0).toFixed(2)}`}
          color="#7c3aed"
        />
      </div>

      {/* Gráfico de ingresos */}
      <div className="metrics-chart-card">
        <h2 className="metrics-chart-title">Ganancia del admin por mes · últimos 6 meses (real + prueba)</h2>
        <RevenueMonthlyChart data={chart} />
      </div>

      {/* Pedidos por estado y tipo */}
      <div className="metrics-bottom">
        <div className="metrics-detail-card">
          <h3 className="metrics-detail-title">Pedidos por estado</h3>
          {metrics.orders.byStatus && Object.entries(metrics.orders.byStatus).map(([status, count]) => (
            <div key={status} className="metrics-detail-row">
              <span className={`metrics-status metrics-status--${status.toLowerCase()}`}>{status}</span>
              <span className="metrics-detail-count">{count}</span>
            </div>
          ))}
        </div>

        <div className="metrics-detail-card">
          <h3 className="metrics-detail-title">Pedidos por tipo</h3>
          {metrics.orders.byType && Object.entries(metrics.orders.byType).map(([type, count]) => (
            <div key={type} className="metrics-detail-row">
              <span>{type === 'DELIVERY' ? '🛵 Delivery' : '📅 Reserva'}</span>
              <span className="metrics-detail-count">{count}</span>
            </div>
          ))}
        </div>

        <div className="metrics-detail-card">
          <h3 className="metrics-detail-title">Top restaurantes</h3>
          {metrics.topRestaurants?.length === 0 && <p style={{ color: '#9ca3af', fontSize: '.82rem' }}>Aún no hay restaurantes activos con pedidos.</p>}
          {metrics.topRestaurants?.map((r, i) => (
            <div key={r.id} className="metrics-detail-row">
              <span className="metrics-top-rank">#{i + 1}</span>
              <span className="metrics-top-name">{r.name}</span>
              <span className="metrics-detail-count">{r.totalOrders} pedidos</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
