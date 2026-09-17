import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarketingAdmins, useMarketingAdminInviteMutations } from '../../hooks/useAdmin.js'
import './AdminSection.css'
import './AdminAdministrators.css'

export default function AdminAdministrators() {
  const [period,setPeriod]=useState('month')
  const [email,setEmail]=useState('')
  const {data:response,isLoading}=useMarketingAdmins(period)
  const inviteMutations=useMarketingAdminInviteMutations()
  const data=response?.data
  const invites=data?.invites||[]
  const addInvite=event=>{event.preventDefault();inviteMutations.create.mutate(email,{onSuccess:()=>setEmail('')})}
  const sessions=data?.admins?.flatMap(admin=>admin.adminSessions.map(session=>({admin:admin.name,startedAt:session.startedAt,endedAt:session.endedAt})))||[]
  const group=new Map()
  const bucketLabel=value=>{const d=new Date(value);return period==='day'?`${d.getHours()}:00`:period==='week'?d.toLocaleDateString('es-PE',{weekday:'short'}):period==='year'?d.toLocaleDateString('es-PE',{month:'short'}):d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'})}
  sessions.forEach(s=>{const start=bucketLabel(s.startedAt);const starts=group.get(start)||{starts:0,ends:0};starts.starts+=1;group.set(start,starts);if(s.endedAt){const end=bucketLabel(s.endedAt);const ends=group.get(end)||{starts:0,ends:0};ends.ends+=1;group.set(end,ends)}})
  const values=[...group.entries()]
  const max=Math.max(1,...values.flatMap(([,v])=>[v.starts,v.ends]))
  return <div className="admin-section">
    <section className="admin-marketing-accounts">
      <div className="admin-section-toolbar"><div><strong>Cuentas de administrador de marketing</strong><p>{data?.slotsUsed ?? 0} de 2 cuentas registradas</p></div><Link to="/adminMark/register">Abrir acceso de registro</Link></div>
      <form className="admin-marketing-create" onSubmit={addInvite}><label htmlFor="marketing-admin-email">Correo que podrá registrarse en Auth0</label><div><input id="marketing-admin-email" type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="nombre@empresa.com"/><button disabled={inviteMutations.create.isPending||(data?.slotsUsed??0)>=2}>Registrar correo</button></div><small>El correo queda pendiente hasta que lo apruebes. La persona debe usar exactamente este correo en Auth0.</small></form>
      <div className="admin-marketing-invites">{invites.length===0?<p>Todavía no hay cuentas registradas.</p>:invites.map(invite=><article key={invite.id}><div><strong>{invite.email}</strong><span className={`admin-marketing-status admin-marketing-status--${invite.status.toLowerCase()}`}>{invite.status==='APPROVED'?'Aprobada':invite.status==='SUSPENDED'?'Suspendida':'Pendiente de aprobación'}</span><small>{invite.accountCreated?`Cuenta Auth0 creada${invite.name?` por ${invite.name}`:''}`:'La cuenta todavía no se ha registrado en Auth0'}</small><small>Correo registrado: {new Date(invite.createdAt).toLocaleString('es-PE')}</small></div><div className="admin-marketing-actions">{invite.status!=='APPROVED'&&<button onClick={()=>inviteMutations.approve.mutate(invite.id)} disabled={inviteMutations.approve.isPending}>Aprobar / reactivar</button>}{invite.status!=='SUSPENDED'&&<button className="admin-marketing-suspend" onClick={()=>inviteMutations.suspend.mutate(invite.id)} disabled={inviteMutations.suspend.isPending}>Suspender</button>}</div></article>)}</div>
    </section>
    <div className="admin-section-toolbar"><strong>Actividad de inicio y cierre de sesión</strong><div className="admin-admin-period">{[['day','Día'],['week','Semana'],['month','Mes'],['year','Año']].map(([key,label])=><button className={period===key?'selected':''} key={key} onClick={()=>setPeriod(key)}>{label}</button>)}</div></div>
    {isLoading?<p>Cargando sesiones…</p>:<><div className="admin-admin-chart">{values.length?values.map(([label,count])=><div key={label} title={`${label}: ${count.starts} entradas · ${count.ends} salidas`}><span className="admin-admin-bars"><i style={{height:`${Math.max(4,count.starts/max*100)}%`}}/><i className="admin-admin-exit" style={{height:`${Math.max(4,count.ends/max*100)}%`}}/></span><small>{label}</small></div>):<p>No hay sesiones registradas en este periodo.</p>}</div><p className="admin-admin-legend"><span>Entradas</span><span>Salidas</span></p><div className="admin-admin-list">{data?.admins?.map(admin=><article key={admin.id}><h3>{admin.name}</h3><span>{admin.email}</span><strong>{admin.adminSessions.length} inicios de sesión en el periodo</strong>{admin.adminSessions.map(s=><small key={s.id}>Entró: {new Date(s.startedAt).toLocaleString('es-PE')} · Salió: {s.endedAt?new Date(s.endedAt).toLocaleString('es-PE'):'Sesión activa'}</small>)}</article>)}</div></>}
  </div>
}
