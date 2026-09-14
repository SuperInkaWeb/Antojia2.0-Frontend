import { createElement } from 'react'
import { Users, Store, ShoppingBag, DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useMetrics, useRevenueChart } from '../../hooks/useAdmin.js'
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

function SimpleBarChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="chart-empty">Sin datos de ingresos aún</div>
  )
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div className="chart">
      {data.map((d, i) => (
        <div key={i} className="chart-col">
          <span className="chart-val">S/{(d.revenue / 1000).toFixed(1)}k</span>
          <div className="chart-bar-wrap">
            <div
              className="chart-bar"
              style={{ height: `${(d.revenue / max) * 100}%` }}
            />
          </div>
          <span className="chart-label">{d.month?.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminMetrics() {
  const { data: metrics, isLoading } = useMetrics()
  const { data: chart }              = useRevenueChart()

  if (isLoading) return (
    <div className="metrics-skeleton">
      {[1,2,3,4].map(i => <div key={i} className="metrics-skeleton-card" />)}
    </div>
  )

  if (!metrics) return null

  return (
    <div className="metrics">

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
          icon={Clock}
          label="Ventas de prueba (no cobradas)"
          value={`S/ ${Number(metrics.revenue.testSalesThisMonth || 0).toLocaleString()}`}
          sub={`${metrics.revenue.testPaymentsThisMonth || 0} pagos sandbox · comisión admin simulada: S/ ${Number(metrics.revenue.testAdminCommissionThisMonth || 0).toFixed(2)}`}
          color="#7c3aed"
        />
      </div>

      {/* Gráfico de ingresos */}
      <div className="metrics-chart-card">
        <h2 className="metrics-chart-title">Ganancia del admin por mes · últimos 6 meses</h2>
        <SimpleBarChart data={chart} />
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
