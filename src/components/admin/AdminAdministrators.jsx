import { useState } from 'react'
import { useMarketingAdmins } from '../../hooks/useAdmin.js'
import './AdminSection.css'
import './AdminAdministrators.css'

export default function AdminAdministrators() {
  const [period,setPeriod]=useState('month')
  const {data:response,isLoading}=useMarketingAdmins(period)
  const data=response?.data
  const sessions=data?.admins?.flatMap(admin=>admin.adminSessions.map(session=>({admin:admin.name,startedAt:session.startedAt,endedAt:session.endedAt})))||[]
  const group=new Map()
  const bucketLabel=value=>{const d=new Date(value);return period==='day'?`${d.getHours()}:00`:period==='week'?d.toLocaleDateString('es-PE',{weekday:'short'}):period==='year'?d.toLocaleDateString('es-PE',{month:'short'}):d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'})}
  sessions.forEach(s=>{const start=bucketLabel(s.startedAt);const starts=group.get(start)||{starts:0,ends:0};starts.starts+=1;group.set(start,starts);if(s.endedAt){const end=bucketLabel(s.endedAt);const ends=group.get(end)||{starts:0,ends:0};ends.ends+=1;group.set(end,ends)}})
  const values=[...group.entries()]
  const max=Math.max(1,...values.flatMap(([,v])=>[v.starts,v.ends]))
  return <div className="admin-section"><div className="admin-section-toolbar"><strong>Administradores de marketing · {data?.total ?? '—'} de 2 cuentas</strong><div className="admin-admin-period">{[['day','Día'],['week','Semana'],['month','Mes'],['year','Año']].map(([key,label])=><button className={period===key?'selected':''} key={key} onClick={()=>setPeriod(key)}>{label}</button>)}</div></div>{isLoading?<p>Cargando sesiones…</p>:<><div className="admin-admin-chart">{values.length?values.map(([label,count])=><div key={label} title={`${label}: ${count.starts} entradas · ${count.ends} salidas`}><span className="admin-admin-bars"><i style={{height:`${Math.max(4,count.starts/max*100)}%`}}/><i className="admin-admin-exit" style={{height:`${Math.max(4,count.ends/max*100)}%`}}/></span><small>{label}</small></div>):<p>No hay sesiones registradas en este periodo.</p>}</div><p className="admin-admin-legend"><span>Entradas</span><span>Salidas</span></p><div className="admin-admin-list">{data?.admins?.map(admin=><article key={admin.id}><h3>{admin.name}</h3><span>{admin.email}</span><strong>{admin.adminSessions.length} inicios de sesión en el periodo</strong>{admin.adminSessions.map(s=><small key={s.id}>Entró: {new Date(s.startedAt).toLocaleString('es-PE')} · Salió: {s.endedAt?new Date(s.endedAt).toLocaleString('es-PE'):'Sesión activa'}</small>)}</article>)}</div></>}</div>
}
