import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketingAdmins, useMarketingAdminInviteMutations, useTechAdmins, useFinanceAdmins } from '../../hooks/useAdmin.js'
import TechAdminInvites from './TechAdminInvites.jsx'
import FinanceAdminInvites from './FinanceAdminInvites.jsx'
import './AdminSection.css'
import './AdminAdministrators.css'

const limaDate = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
const dateFromKey = key => new Date(`${key}T12:00:00Z`)
const dateKeyOffset = (key, offset) => {
  const date = dateFromKey(key)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
const hourInLima = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', hourCycle: 'h23' }).format(new Date(value))

function makeBuckets(period, selectedDate) {
  if (period === 'day') return Array.from({ length: 24 }, (_, hour) => ({ key: String(hour).padStart(2, '0'), label: hour % 3 === 0 ? String(hour).padStart(2, '0') : '', title: `${String(hour).padStart(2, '0')}:00` }))
  if (period === 'week') return Array.from({ length: 7 }, (_, index) => {
    const key = dateKeyOffset(selectedDate, index - 6)
    return { key, label: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short' }).format(dateFromKey(key)), title: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium' }).format(dateFromKey(key)) }
  })
  if (period === 'year') return Array.from({ length: 12 }, (_, index) => {
    const key = `${selectedDate.slice(0, 4)}-${String(index + 1).padStart(2, '0')}`
    return { key, label: new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'America/Lima' }).format(new Date(`${key}-15T12:00:00Z`)), title: new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(`${key}-15T12:00:00Z`)) }
  })
  const [year, month] = selectedDate.split('-').map(Number)
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Array.from({ length: count }, (_, index) => {
    const key = `${selectedDate.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`
    return { key, label: String(index + 1), title: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium' }).format(dateFromKey(key)) }
  })
}

function getBucketKey(value, period) {
  const date = new Date(value)
  if (period === 'day') return hourInLima(date)
  const key = limaDate(date)
  return period === 'year' ? key.slice(0, 7) : key
}

function MarketingAdminSessionChart({ admin, period, selectedDate }) {
  const buckets = useMemo(() => makeBuckets(period, selectedDate), [period, selectedDate])
  const totals = new Map(buckets.map(bucket => [bucket.key, { entries: 0, exits: 0 }]))
  for (const session of admin.adminSessions) {
    const entry = totals.get(getBucketKey(session.startedAt, period))
    if (entry) entry.entries += 1
    if (session.endedAt) {
      const exit = totals.get(getBucketKey(session.endedAt, period))
      if (exit) exit.exits += 1
    }
  }
  const maxValue = Math.max(1, ...[...totals.values()].flatMap(value => [value.entries, value.exits]))
  const axisMax = Math.max(1, Math.ceil(maxValue / 4) * 4)
  const width = Math.max(760, buckets.length * 38 + 88)
  const height = 270
  const left = 56
  const right = 16
  const top = 16
  const bottom = 48
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const groupWidth = plotWidth / buckets.length
  const barWidth = Math.min(12, groupWidth * 0.28)
  const y = value => top + plotHeight - value / axisMax * plotHeight

  return <div className="admin-admin-chart-scroll"><svg className="admin-admin-session-svg" style={{ width: `${width}px` }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Inicios y cierres de sesión de ${admin.email}`}>
    {[0, 1, 2, 3, 4].map(tick => {
      const value = axisMax * tick / 4
      const yPosition = y(value)
      return <g key={tick}><line x1={left} x2={width - right} y1={yPosition} y2={yPosition} className="admin-admin-gridline"/><text x={left - 9} y={yPosition + 4} textAnchor="end" className="admin-admin-axis-label">{value}</text></g>
    })}
    {buckets.map((bucket, index) => {
      const value = totals.get(bucket.key)
      const center = left + groupWidth * (index + 0.5)
      const entryHeight = value.entries ? Math.max(2, value.entries / axisMax * plotHeight) : 0
      const exitHeight = value.exits ? Math.max(2, value.exits / axisMax * plotHeight) : 0
      return <g key={bucket.key}>
        <rect x={center - barWidth - 1} y={top + plotHeight - entryHeight} width={barWidth} height={entryHeight} rx="3" className="admin-admin-entry-bar"><title>{`${bucket.title}: ${value.entries} inicios de sesión`}</title></rect>
        <rect x={center + 1} y={top + plotHeight - exitHeight} width={barWidth} height={exitHeight} rx="3" className="admin-admin-exit-bar"><title>{`${bucket.title}: ${value.exits} cierres de sesión`}</title></rect>
        {bucket.label && <text x={center} y={height - 26} textAnchor="middle" className="admin-admin-period-label">{bucket.label}</text>}
      </g>
    })}
    <text x="15" y={top + plotHeight / 2} transform={`rotate(-90 15 ${top + plotHeight / 2})`} textAnchor="middle" className="admin-admin-axis-title">Sesiones</text>
  </svg></div>
}

export default function AdminAdministrators() {
  const today = limaDate(new Date())
  const [period, setPeriod] = useState('month')
  const [selectedDate, setSelectedDate] = useState(today)
  const [share, setShare] = useState(null)
  const [marketingSearch, setMarketingSearch] = useState('')
  const [marketingStatus, setMarketingStatus] = useState('ALL')
  const [adminType, setAdminType] = useState('MARKETING')
  const { data: response, isLoading, isError } = useMarketingAdmins(period, selectedDate)
  const { data: techResponse, isLoading: techLoading } = useTechAdmins(period, selectedDate)
  const { data: financeResponse, isLoading: financeLoading } = useFinanceAdmins(period, selectedDate)
  const mutations = useMarketingAdminInviteMutations()
  const data = response?.data
  const techData = techResponse?.data
  const financeData = financeResponse?.data
  const invites = data?.invites || []
  const filteredInvites = invites.filter(invite => {
    const text = `${invite.name || ''} ${invite.email || ''}`.toLowerCase()
    return (!marketingSearch.trim() || text.includes(marketingSearch.trim().toLowerCase())) && (marketingStatus === 'ALL' || invite.status === marketingStatus)
  })
  const createLink = () => mutations.create.mutate(undefined, { onSuccess: result => showLink(result.data.data) })
  const refreshLink = id => mutations.refreshLink.mutate(id, { onSuccess: result => showLink(result.data.data) })
  const showLink = invite => setShare({ id: invite.id, url: `${window.location.origin}/adminMark/register?invite=${invite.registrationToken}` })


  return <div className="admin-section">
    <details className="admin-admin-disclosure" open>
      <summary>Administradores de marketing <span>{data?.total ?? 0} activos · {invites.length} enlaces</span></summary>
    <section className="admin-marketing-accounts">
      <div className="admin-section-toolbar">
        <div><strong>Cuentas de administrador de marketing</strong><p>{data?.total ?? 0} cuentas activas · {data?.slotsUsed ?? 0} enlaces creados</p></div>
        <button onClick={createLink} disabled={isLoading || isError || mutations.create.isPending}>Crear enlace de registro</button>
      </div>
      {isError && <p className="admin-marketing-error">No se pudieron cargar las invitaciones. Verifica que el backend esté actualizado y que sus migraciones estén aplicadas.</p>}
      <p className="admin-marketing-help">Comparte el enlace con la persona. Podrá crear su cuenta de Auth0 o iniciar sesión y se le abrirá el dashboard de marketing. El enlace vence en 7 días.</p>
      <div className="admin-account-filters"><input value={marketingSearch} onChange={event => setMarketingSearch(event.target.value)} placeholder="Buscar por nombre o correo…"/><select value={marketingStatus} onChange={event => setMarketingStatus(event.target.value)}><option value="ALL">Todas</option><option value="APPROVED">Activas / aprobadas</option><option value="SUSPENDED">Suspendidas</option><option value="PENDING">Pendientes</option></select></div>
      {share && <div className="admin-marketing-share"><label htmlFor="marketing-share-link">Enlace listo para compartir</label><input id="marketing-share-link" readOnly value={share.url} onFocus={event => event.target.select()}/><button onClick={() => navigator.clipboard?.writeText(share.url)}>Copiar enlace</button></div>}
      <div className="admin-marketing-invites">{filteredInvites.length === 0 ? <p>No hay cuentas con estos filtros.</p> : filteredInvites.map(invite => <article key={invite.id}>
        <div>
          <strong>{invite.email || 'Enlace de registro'}</strong>
          <span className={`admin-marketing-status admin-marketing-status--${invite.status.toLowerCase()}`}>{invite.status === 'SUSPENDED' ? 'Suspendida' : invite.status === 'PENDING' ? 'Pendiente de aprobación' : invite.isMarketingAdmin ? 'Cuenta activa' : 'Aprobada; esperando registro'}</span>
          <small>{invite.accountCreated ? `Cuenta Auth0 creada${invite.name ? ` por ${invite.name}` : ''}` : invite.tokenActive ? 'Enlace activo; aún no se ha registrado' : 'El enlace venció o falta copiarlo; puedes generar otro'}</small>
          <small>Creado: {new Date(invite.createdAt).toLocaleString('es-PE')}</small>
        </div>
        <div className="admin-marketing-actions">
          {!invite.isMarketingAdmin && invite.status === 'APPROVED' && <button onClick={() => refreshLink(invite.id)} disabled={mutations.refreshLink.isPending}>{invite.tokenActive ? 'Renovar enlace' : 'Generar enlace'}</button>}
          {invite.status !== 'APPROVED' && <button onClick={() => mutations.approve.mutate(invite.id)} disabled={mutations.approve.isPending}>Aprobar / reactivar</button>}
          {invite.status !== 'SUSPENDED' && <button className="admin-marketing-suspend" onClick={() => mutations.suspend.mutate(invite.id)} disabled={mutations.suspend.isPending}>Suspender</button>}
        </div>
        {share?.id === invite.id && <Link className="admin-marketing-copy-link" to={share.url.replace(window.location.origin, '')}>Abrir enlace de registro</Link>}
      </article>)}</div>
    </section>
    </details>

    <TechAdminInvites />
    <FinanceAdminInvites />
    <div className="admin-section-toolbar admin-admin-activity-toolbar"><div><strong>Actividad de administradores</strong><p>Consulta a qué hora entran y salen las cuentas de marketing, técnicas y financieras.</p></div><label className="admin-admin-date">Tipo de administrador<select value={adminType} onChange={event=>setAdminType(event.target.value)}><option value="MARKETING">Administrador de marketing</option><option value="TECH">Administrador técnico</option><option value="FINANCE">Administrador financiero</option></select></label><label className="admin-admin-date">Fecha de referencia<input type="date" value={selectedDate} onChange={event=>{setSelectedDate(event.target.value);setPeriod('day')}}/></label><div className="admin-admin-period">{[['day','Día'],['week','Semana'],['month','Mes'],['year','Año']].map(([key,label])=><button className={period===key?'selected':''} key={key} onClick={()=>setPeriod(key)}>{label}</button>)}</div></div>
    {(isLoading || techLoading || financeLoading) ? <p>Cargando sesiones…</p> : <>
      <div className="admin-admin-list">{(adminType === 'TECH' ? techData?.admins : adminType === 'FINANCE' ? financeData?.admins : data?.admins)?.map(admin=>{
        const activityData = adminType === 'TECH' ? techData : adminType === 'FINANCE' ? financeData : data
        const startsAt = new Date(activityData.rangeStart).getTime()
        const endsAt = new Date(activityData.rangeEnd).getTime()
        const entries = admin.adminSessions.filter(session=>new Date(session.startedAt).getTime()>=startsAt&&new Date(session.startedAt).getTime()<endsAt).length
        const exits = admin.adminSessions.filter(session=>session.endedAt&&new Date(session.endedAt).getTime()>=startsAt&&new Date(session.endedAt).getTime()<endsAt).length
        return <article key={admin.id}><div className="admin-admin-account-heading"><div><h3>{admin.name || (adminType === 'TECH' ? 'Administrador técnico' : adminType === 'FINANCE' ? 'Administrador financiero' : 'Administrador de marketing')}</h3><span>{admin.email}</span></div><div className="admin-admin-account-stats"><strong>{entries}<small>Inicios</small></strong><strong>{exits}<small>Cierres</small></strong></div></div><div className="admin-admin-legend"><span><i className="admin-admin-entry-key"/>Inicios de sesión</span><span><i className="admin-admin-exit-key"/>Cierres de sesión</span></div><MarketingAdminSessionChart admin={admin} period={period} selectedDate={selectedDate}/>{admin.adminSessions.length>0&&<details className="admin-admin-session-details"><summary>Ver registros exactos ({admin.adminSessions.length})</summary>{admin.adminSessions.map(session=><small key={session.id}>Entró: {new Date(session.startedAt).toLocaleString('es-PE')} · Salió: {session.endedAt?new Date(session.endedAt).toLocaleString('es-PE'):'Sesión activa'}</small>)}</details>}{entries===0&&exits===0&&<p className="admin-admin-no-sessions">No hay actividad para esta cuenta en el periodo seleccionado.</p>}</article>
      })}{(adminType === 'TECH' ? techData?.admins : adminType === 'FINANCE' ? financeData?.admins : data?.admins)?.length===0&&<p>No hay cuentas de {adminType === 'TECH' ? 'administrador técnico' : adminType === 'FINANCE' ? 'administrador financiero' : 'administrador de marketing'} registradas.</p>}</div>
    </>}
  </div>
}
