import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketingAdmins, useMarketingAdminInviteMutations } from '../../hooks/useAdmin.js'
import './AdminSection.css'
import './AdminAdministrators.css'

export default function AdminAdministrators() {
  const [period, setPeriod] = useState('month')
  const [share, setShare] = useState(null)
  const { data: response, isLoading, isError } = useMarketingAdmins(period)
  const mutations = useMarketingAdminInviteMutations()
  const data = response?.data
  const invites = data?.invites || []
  const createLink = () => mutations.create.mutate(undefined, { onSuccess: result => showLink(result.data.data) })
  const refreshLink = id => mutations.refreshLink.mutate(id, { onSuccess: result => showLink(result.data.data) })
  const showLink = invite => setShare({ id: invite.id, url: `${window.location.origin}/adminMark/register?invite=${invite.registrationToken}` })

  const sessions = data?.admins?.flatMap(admin => admin.adminSessions.map(session => ({ startedAt: session.startedAt, endedAt: session.endedAt }))) || []
  const bucketLabel = value => {
    const date = new Date(value)
    return period === 'day' ? `${date.getHours()}:00` : period === 'week' ? date.toLocaleDateString('es-PE', { weekday: 'short' }) : period === 'year' ? date.toLocaleDateString('es-PE', { month: 'short' }) : date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
  }
  const grouped = new Map()
  sessions.forEach(session => {
    const start = bucketLabel(session.startedAt)
    const starts = grouped.get(start) || { starts: 0, ends: 0 }
    starts.starts += 1
    grouped.set(start, starts)
    if (session.endedAt) {
      const end = bucketLabel(session.endedAt)
      const ends = grouped.get(end) || { starts: 0, ends: 0 }
      ends.ends += 1
      grouped.set(end, ends)
    }
  })
  const values = [...grouped.entries()]
  const max = Math.max(1, ...values.flatMap(([, count]) => [count.starts, count.ends]))

  return <div className="admin-section">
    <section className="admin-marketing-accounts">
      <div className="admin-section-toolbar">
        <div><strong>Cuentas de administrador de marketing</strong><p>{data?.slotsUsed ?? 0} de 2 enlaces/cuentas creados</p></div>
        <button onClick={createLink} disabled={isLoading || isError || mutations.create.isPending || (data?.slotsUsed ?? 0) >= 2}>Crear enlace de registro</button>
      </div>
      {isError && <p className="admin-marketing-error">No se pudieron cargar las invitaciones. Verifica que el backend esté actualizado y que sus migraciones estén aplicadas.</p>}
      <p className="admin-marketing-help">Comparte el enlace con la persona. Podrá crear su cuenta de Auth0 o iniciar sesión y se le abrirá el dashboard de marketing. El enlace vence en 7 días.</p>
      {share && <div className="admin-marketing-share"><label htmlFor="marketing-share-link">Enlace listo para compartir</label><input id="marketing-share-link" readOnly value={share.url} onFocus={event => event.target.select()}/><button onClick={() => navigator.clipboard?.writeText(share.url)}>Copiar enlace</button></div>}
      <div className="admin-marketing-invites">{invites.length === 0 ? <p>Todavía no se han creado enlaces.</p> : invites.map(invite => <article key={invite.id}>
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

    <div className="admin-section-toolbar"><strong>Actividad de inicio y cierre de sesión</strong><div className="admin-admin-period">{[['day','Día'],['week','Semana'],['month','Mes'],['year','Año']].map(([key,label])=><button className={period===key?'selected':''} key={key} onClick={()=>setPeriod(key)}>{label}</button>)}</div></div>
    {isLoading ? <p>Cargando sesiones…</p> : <>
      <div className="admin-admin-chart">{values.length ? values.map(([label,count])=><div key={label} title={`${label}: ${count.starts} entradas · ${count.ends} salidas`}><span className="admin-admin-bars"><i style={{height:`${Math.max(4,count.starts/max*100)}%`}}/><i className="admin-admin-exit" style={{height:`${Math.max(4,count.ends/max*100)}%`}}/></span><small>{label}</small></div>) : <p>No hay sesiones registradas en este periodo.</p>}</div>
      <p className="admin-admin-legend"><span>Entradas</span><span>Salidas</span></p>
      <div className="admin-admin-list">{data?.admins?.map(admin=><article key={admin.id}><h3>{admin.name}</h3><span>{admin.email}</span><strong>{admin.adminSessions.length} inicios de sesión en el periodo</strong>{admin.adminSessions.map(session=><small key={session.id}>Entró: {new Date(session.startedAt).toLocaleString('es-PE')} · Salió: {session.endedAt?new Date(session.endedAt).toLocaleString('es-PE'):'Sesión activa'}</small>)}</article>)}</div>
    </>}
  </div>
}
