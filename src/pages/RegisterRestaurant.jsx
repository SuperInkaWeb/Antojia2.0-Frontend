import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ChefHat, ArrowLeft, Loader2, CheckCircle,
  XCircle, MapPin, Phone, FileText, Store,
} from 'lucide-react'
import RestaurantLocationPicker from '../components/restaurant/RestaurantLocationPicker.jsx'
import Navbar from '../components/layout/Navbar.jsx'
import ImageUploader from '../components/ui/ImageUploader.jsx'
import { useApi } from '../hooks/useApi.js'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import toast from 'react-hot-toast'
import './RegisterRestaurant.css'

// ── Constantes ─────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'cevicheria', label: '🐟 Cevichería' },
  { value: 'chifa',      label: '🍜 Chifa' },
  { value: 'fast_food',  label: '🍔 Fast Food' },
  { value: 'pizzeria',   label: '🍕 Pizzería' },
  { value: 'parrilla',   label: '🥩 Parrilla' },
  { value: 'heladeria',  label: '🍦 Heladería' },
  { value: 'cafe',       label: '☕ Café' },
  { value: 'buffet',     label: '🥗 Buffet' },
  { value: 'otro',       label: '🍽️ Otro' },
]

const DISTRICTS = [
  'Ancón','Ate','Barranco','Breña','Carabayllo','Chaclacayo','Chorrillos',
  'Cieneguilla','Comas','Cercado de Lima','El Agustino','Independencia',
  'Jesús María','La Molina','La Victoria','Lince','Los Olivos',
  'Lurigancho-Chosica','Lurín','Magdalena del Mar','Miraflores','Pachacámac',
  'Pucusana','Pueblo Libre','Puente Piedra','Punta Hermosa','Punta Negra',
  'Rímac','San Bartolo','San Borja','San Isidro','San Juan de Lurigancho',
  'San Juan de Miraflores','San Luis','San Martín de Porres','San Miguel',
  'Santa Anita','Santa María del Mar','Santa Rosa','Surco','Surquillo',
  'Villa El Salvador','Villa María del Triunfo',
]

// ── Pantalla de éxito ──────────────────────────────────────────
function SuccessScreen({ restaurantName, onOpenDashboard }) {
  return (
    <div className="rr-success">
      <div className="rr-success-icon">🎉</div>
      <h2>¡Solicitud enviada!</h2>
      <p>
        <strong>{restaurantName}</strong> ha sido registrado y está
        pendiente de verificación por nuestro equipo.
      </p>
      <p className="rr-success-sub">
        Te notificaremos por correo cuando tu restaurante esté aprobado
        y puedas comenzar a recibir pedidos.
      </p>
      <div className="rr-success-steps">
        <div className="rr-step rr-step--done"><CheckCircle size={16}/> Restaurante registrado</div>
        <div className="rr-step"><span className="rr-step-dot"/>Revisión del equipo Foodinka</div>
        <div className="rr-step"><span className="rr-step-dot"/>Activación y apertura</div>
      </div>
      <button className="rr-btn-primary" onClick={onOpenDashboard}>
        Abrir mi panel
      </button>
    </div>
  )
}

// ── Formulario principal ───────────────────────────────────────
export default function RegisterRestaurant() {
  const navigate    = useNavigate()
  const api         = useApi()
  const qc          = useQueryClient()
  const { isAuthenticated, loginWithRedirect } = useAuth0()
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()

  const [form, setForm] = useState({
    name: '', ruc: '', category: '', description: '',
    address: '', addressReference: '', district: '', phone: '', latitude: null, longitude: null, logoUrl: '',
    accountNumber: '',
  })
  const [rucStatus, setRucStatus] = useState(null) // null | 'checking' | 'valid' | 'invalid'
  const [rucData,   setRucData]   = useState(null)
  const [rucErrMsg, setRucErrMsg] = useState(null)
  const currentRucRef = useRef('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fillAddressFromMap = ({ address, district }) => {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    const detected = normalize(district)
    const aliases = { 'santiago de surco': 'Surco', 'lima cercado': 'Cercado de Lima' }
    const matchedDistrict = aliases[detected] || DISTRICTS.find(item => {
      const option = normalize(item)
      return detected === option || detected.includes(option) || option.includes(detected)
    })
    setForm(current => ({
      ...current,
      ...(address ? { address } : {}),
      ...(matchedDistrict ? { district: matchedDistrict } : {}),
    }))
  }

  const reverseGeocode = async ({ latitude, longitude }) => {
    const { data } = await api.get('/api/v1/orders/reverse-geocode', { params: { latitude, longitude } })
    return data.data
  }

  // ── Verificar RUC con SUNAT ────────────────────────────────
  const handleRucChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11)
    currentRucRef.current = val
    setForm(f => ({ ...f, ruc: val }))
    setRucData(null)
    setRucErrMsg(null)

    if (val.length === 11) {
      setRucStatus('checking')
      try {
        const { data } = await api.get(`/api/v1/restaurants/verify-ruc/${val}`)

        // Ignorar respuesta si el usuario ya cambió el RUC
        if (currentRucRef.current !== val) return

        setRucStatus('valid')
        setRucData(data.data)
        if (data.data?.razonSocial) {
          setForm(f => ({ ...f, ruc: val, name: f.name ? f.name : data.data.razonSocial }))
        } else {
          setForm(f => ({ ...f, ruc: val }))
        }
      } catch (err) {
        if (currentRucRef.current !== val) return
        const msg = err?.response?.data?.message || 'RUC no encontrado o inactivo en SUNAT'
        setRucStatus('invalid')
        setRucErrMsg(msg)
        setForm(f => ({ ...f, ruc: val }))
      }
    } else {
      setRucStatus(null)
    }
  }

  // ── Enviar formulario ──────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValid || loading) return
    setLoading(true)
    try {
      await api.post('/api/v1/auth/register-restaurant', {
        name:        form.name,
        ruc:         form.ruc,
        category:    form.category,
        description: form.description || undefined,
        address:     form.address,
        addressReference: form.addressReference || undefined,
        district:    form.district,
        phone:       form.phone || undefined,
        latitude:    form.latitude,
        longitude:   form.longitude,
        logoUrl:     form.logoUrl || undefined,
        accountNumber: form.accountNumber,
      })
      // Invalidar cache del usuario para que Navbar actualice el rol
      qc.invalidateQueries({ queryKey: ['current-user'] })
      setDone(true)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al registrar el restaurante'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const isValid = rucStatus === 'valid' && form.name && form.category && form.address && form.district && /^\d{8,20}$/.test(form.accountNumber.replace(/\s/g, '')) && form.latitude != null && form.longitude != null

  // ── Pantalla de éxito ─────────────────────────────────────
  if (done) {
    return (
      <div className="rr">
        <Navbar />
        <div className="rr-inner">
          <SuccessScreen restaurantName={form.name} onOpenDashboard={() => navigate('/restaurant-dashboard')} />
        </div>
      </div>
    )
  }

  // ── Sin sesión ────────────────────────────────────────────
  if (!userLoading && !isAuthenticated) {
    return (
      <div className="rr">
        <Navbar />
        <div className="rr-inner">
          <div className="rr-gate">
            <Store size={44} strokeWidth={1.5}/>
            <h2>Inicia sesión para continuar</h2>
            <p>Necesitas una cuenta para registrar tu restaurante.</p>
            <button className="rr-btn-primary" onClick={() => loginWithRedirect()}>
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Ya tiene restaurante ──────────────────────────────────
  if (!userLoading && currentUser?.restaurant) {
    return (
      <div className="rr">
        <Navbar />
        <div className="rr-inner">
          <div className="rr-gate">
            <CheckCircle size={44} strokeWidth={1.5} color="#16a34a"/>
            <h2>Ya tienes un restaurante</h2>
            <p><strong>{currentUser.restaurant.name}</strong></p>
            <p className="rr-gate-sub">
              Estado: {currentUser.restaurant.status === 'ACTIVE' ? '✅ Activo' :
                       currentUser.restaurant.status === 'PENDING_VERIFICATION' ? '⏳ Pendiente de verificación' :
                       currentUser.restaurant.status}
            </p>
            <button className="rr-btn-primary" onClick={() => navigate('/restaurant-dashboard')}>
              Ver pedidos
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulario ────────────────────────────────────────────
  return (
    <div className="rr">
      <Navbar />
      <div className="rr-inner">

        {/* Encabezado */}
        <div className="rr-header">
          <button className="rr-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={16}/> Volver
          </button>
          <div className="rr-title-wrap">
            <div className="rr-title-icon"><ChefHat size={22}/></div>
            <div>
              <h1 className="rr-title">Inscribe tu restaurante</h1>
              <p className="rr-subtitle">Completa el formulario y nuestro equipo lo revisará en 24–48 h</p>
            </div>
          </div>
        </div>

        {/* Pasos */}
        <div className="rr-progress">
          <div className="rr-progress-step rr-progress-step--active">
            <span>1</span> Datos del negocio
          </div>
          <div className="rr-progress-line"/>
          <div className="rr-progress-step">
            <span>2</span> Revisión
          </div>
          <div className="rr-progress-line"/>
          <div className="rr-progress-step">
            <span>3</span> Activación
          </div>
        </div>

        <div className="rr-form">

          {/* ── RUC ─────────────────────────────────────────── */}
          <div className="rr-section">
            <div className="rr-section-title"><FileText size={15}/> Verificación fiscal</div>

            <div className="rr-field">
              <label className="rr-label">RUC <span className="rr-req">*</span></label>
              <div className="rr-ruc-wrap">
                <input
                  className={`rr-input rr-ruc ${
                    rucStatus === 'valid'   ? 'rr-input--valid'   :
                    rucStatus === 'invalid' ? 'rr-input--invalid' : ''
                  }`}
                  type="text"
                  inputMode="numeric"
                  placeholder="20123456789"
                  value={form.ruc}
                  onChange={handleRucChange}
                  maxLength={11}
                />
                <span className="rr-ruc-icon">
                  {rucStatus === 'checking' && <Loader2 size={18} className="rr-spin"/>}
                  {rucStatus === 'valid'    && <CheckCircle size={18} color="#16a34a"/>}
                  {rucStatus === 'invalid'  && <XCircle    size={18} color="#dc2626"/>}
                </span>
              </div>

              {rucStatus === 'valid' && rucData && (
                <div className="rr-ruc-ok">
                  ✅ <strong>{rucData.razonSocial}</strong> — {rucData.estado}
                </div>
              )}
              {rucStatus === 'invalid' && (
                <div className="rr-ruc-err">
                  ❌ {rucErrMsg}
                </div>
              )}
            </div>
          </div>

          {/* ── Info del restaurante ────────────────────────── */}
          <div className="rr-section">
            <div className="rr-section-title"><Store size={15}/> Información del restaurante</div>

            <div className="rr-field">
              <label className="rr-label">Nombre <span className="rr-req">*</span></label>
              <input
                className="rr-input"
                type="text"
                placeholder="Ej: La Cevichería de Carlos"
                value={form.name}
                onChange={set('name')}
              />
            </div>

            <div className="rr-field">
              <label className="rr-label">Categoría <span className="rr-req">*</span></label>
              <div className="rr-categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`rr-cat ${form.category === cat.value ? 'rr-cat--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rr-field">
              <label className="rr-label">
                Descripción <span className="rr-optional">(opcional)</span>
              </label>
              <textarea
                className="rr-input rr-textarea"
                placeholder="Cuéntanos sobre tu restaurante, especialidades, historia..."
                value={form.description}
                onChange={set('description')}
                rows={3}
              />
            </div>

            <div className="rr-field">
              <label className="rr-label">Logo o foto del restaurante <span className="rr-optional">(opcional)</span></label>
              <ImageUploader value={form.logoUrl} onUploaded={url => setForm(current => ({ ...current, logoUrl: url }))} scope="restaurants/logos" label="Subir logo o foto" />
            </div>
          </div>

          {/* ── Ubicación ───────────────────────────────────── */}
          <div className="rr-section">
            <div className="rr-section-title"><MapPin size={15}/> Ubicación</div>

            <div className="rr-row">
              <div className="rr-field">
                <label className="rr-label">Dirección <span className="rr-req">*</span></label>
                <input
                  className="rr-input"
                  type="text"
                  placeholder="Av. La Mar 770"
                  value={form.address}
                  onChange={set('address')}
                />
              </div>
              <div className="rr-field">
                <label className="rr-label">Distrito <span className="rr-req">*</span></label>
                <select className="rr-input" value={form.district} onChange={set('district')}>
                  <option value="">Seleccionar</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="rr-field">
              <label className="rr-label">Referencia <span className="rr-optional">(opcional)</span></label>
              <input className="rr-input" type="text" placeholder="Ej: puerta roja, frente al parque" value={form.addressReference} onChange={set('addressReference')}/>
            </div>

            <div className="rr-field">
              <label className="rr-label">Ubicación exacta en el mapa <span className="rr-req">*</span></label>
              <RestaurantLocationPicker
                value={{ latitude: form.latitude, longitude: form.longitude }}
                onChange={coords => setForm(current => ({ ...current, ...coords }))}
                onAddressResolved={fillAddressFromMap}
                reverseGeocode={reverseGeocode}
              />
            </div>

            <div className="rr-field rr-field--half">
              <label className="rr-label">
                <Phone size={13}/> Teléfono <span className="rr-optional">(opcional)</span>
              </label>
              <input
                className="rr-input"
                type="tel"
                placeholder="01 234 5678"
                value={form.phone}
                onChange={set('phone')}
              />
            </div>
          </div>

          <div className="rr-section">
            <div className="rr-section-title">🏦 Datos para transferencias</div>
            <div className="rr-field">
              <label className="rr-label">Número de cuenta <span className="rr-req">*</span></label>
              <input className="rr-input" type="text" inputMode="numeric" maxLength={20}
                placeholder="Entre 8 y 20 dígitos" value={form.accountNumber}
                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 20) }))}/>
              <small>Se usará para transferirte tus ganancias y se guardará de forma segura.</small>
            </div>
          </div>

          {/* Aviso */}
          <div className="rr-notice">
            <span className="rr-notice-icon">📋</span>
            <p>
              Tu restaurante quedará <strong>pendiente de verificación</strong>.
              Una vez aprobado, podrás configurar tu menú, horarios y precios desde el panel de restaurante.
            </p>
          </div>

          {/* Botón de envío */}
          <button
            className="rr-btn-submit"
            onClick={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading
              ? <><Loader2 size={18} className="rr-spin"/> Enviando solicitud...</>
              : '🚀 Registrar mi restaurante'
            }
          </button>

        </div>
      </div>
    </div>
  )
}
