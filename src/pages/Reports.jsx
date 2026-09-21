import { useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCreateReport, useMyReports } from '../hooks/useReports.js'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import './Reports.css'

const OPTIONS = {
  RESTAURANT_OWNER: [['DASHBOARD', 'Dashboard'], ['DISHES', 'Platos'], ['SALES', 'Ventas'], ['PAYMENTS', 'Pagos'], ['CUSTOMERS', 'Clientes'], ['OTHER', 'Otro']],
  CONSUMER: [['PAGE', 'La página'], ['DISHES', 'Platos'], ['RESTAURANTS', 'Restaurantes'], ['DELIVERY', 'Delivery'], ['PAYMENTS', 'Pagos'], ['CART', 'Carrito'], ['OTHER', 'Otro']],
  DELIVERY: [['ORDERS', 'Pedidos'], ['PAYMENTS', 'Pagos'], ['MAPS', 'Maps'], ['DASHBOARD', 'Dashboard'], ['OTHER', 'Otro']],
}

const label = value => ({ OPEN: 'Pendiente', IN_PROGRESS: 'En revisión', RESOLVED: 'Respondido' }[value] || value)

export default function Reports() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const create = useCreateReport()
  const { data: reports = [], isLoading, isFetching, refetch } = useMyReports()
  const options = OPTIONS[user?.role] || OPTIONS.CONSUMER
  const showNavigationTools = ['CONSUMER', 'DELIVERY'].includes(user?.role)
  const [category, setCategory] = useState(options[0][0])
  const [description, setDescription] = useState('')
  const [sent, setSent] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filteredReports = useMemo(() => reports.filter(report => {
    const date = new Date(report.createdAt)
    if (from && date < new Date(`${from}T00:00:00`)) return false
    if (to && date > new Date(`${to}T23:59:59.999`)) return false
    return true
  }), [from, reports, to])

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(user?.role === 'DELIVERY' ? '/driver' : '/')
  }

  const submit = event => {
    event.preventDefault()
    if (!description.trim()) return
    create.mutate({ category, description }, {
      onSuccess: () => { setDescription(''); setSent(true) },
    })
  }

  return (
    <main className="reports-page">
      <section className="reports-card">
        {showNavigationTools && <button type="button" className="reports-back-button" onClick={handleBack}><ArrowLeft size={17} /> Volver</button>}
        <span className="reports-kicker">Soporte técnico</span>
        <h1>Reportes</h1>
        <p>Cuéntanos qué problema encontraste y nuestro equipo te responderá en un plazo de 24 horas.</p>
        <form onSubmit={submit}>
          <label>¿Cuál es tu error?<select value={category} onChange={event => setCategory(event.target.value)}>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
          <label>Descripción<textarea required minLength={5} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe con detalle qué ocurrió…" /></label>
          <button disabled={create.isPending || !description.trim()}>{create.isPending ? 'Enviando…' : 'Enviar reporte'}</button>
        </form>
      </section>

      <section className="reports-card">
        <div className="reports-history-head">
          <div><h2>Mis reportes</h2><p>Busca tus tickets por rango de fechas.</p></div>
          <div className="reports-history-actions">
            <div className="reports-date-filters"><label>Desde<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button type="button" onClick={() => { setFrom(''); setTo('') }}>Limpiar</button></div>
            {showNavigationTools && <button type="button" className="reports-refresh-button" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={16} className={isFetching ? 'reports-refresh-spinning' : ''} />{isFetching ? 'Actualizando…' : 'Actualizar reportes'}</button>}
          </div>
        </div>
        {isLoading ? <p>Cargando…</p> : reports.length === 0 ? <p>Aún no has enviado reportes.</p> : filteredReports.length === 0 ? <p>No hay reportes dentro de esas fechas.</p> : <div className="reports-list">{filteredReports.map(report => <article key={report.id}><div><strong>{options.find(([value]) => value === report.category)?.[1] || report.category}</strong><small>{new Date(report.createdAt).toLocaleString('es-PE')}</small></div><span className={`report-status report-status--${report.status.toLowerCase()}`}>{label(report.status)}</span><p>{report.description}</p>{report.response && <div className="report-answer"><strong>Respuesta del equipo técnico</strong><p>{report.response}</p></div>}</article>)}</div>}
      </section>

      {sent && <div className="report-confirm-overlay" onClick={() => setSent(false)}><section className="report-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="report-confirm-title" onClick={event => event.stopPropagation()}><div className="report-confirm-icon">✓</div><h2 id="report-confirm-title">¡Tu ticket fue enviado correctamente!</h2><p>Recibimos tu reporte. Se te contestará en el transcurso del día, con un plazo máximo de 24 horas.</p><button onClick={() => setSent(false)}>Entendido</button></section></div>}
    </main>
  )
}
