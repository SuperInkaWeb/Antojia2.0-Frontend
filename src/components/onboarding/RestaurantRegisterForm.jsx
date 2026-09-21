import { useState, useRef } from 'react'
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi.js'
import RestaurantLocationPicker from '../restaurant/RestaurantLocationPicker.jsx'
import './RestaurantRegisterForm.css'

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

export default function RestaurantRegisterForm({ onSubmit, onBack, loading }) {
  const api = useApi()

  const [form, setForm] = useState({
    name: '', ruc: '', category: '', description: '',
    address: '', addressReference: '', district: '', phone: '', latitude: null, longitude: null,
    accountNumber: '',
  })

  const [rucStatus,  setRucStatus]  = useState(null) // null | 'checking' | 'valid' | 'invalid'
  const [rucData,    setRucData]    = useState(null)  // datos de SUNAT
  const [rucErrMsg,  setRucErrMsg]  = useState(null)  // mensaje de error del backend

  // Ref para evitar race conditions: si el usuario escribe otro RUC
  // mientras el anterior aún está cargando, ignoramos la respuesta antigua.
  const currentRucRef = useRef('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const fillAddressFromMap = ({ address, district }) => {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    const detected = normalize(district)
    const aliases = { 'santiago de surco': 'Surco', 'lima cercado': 'Cercado de Lima' }
    const matchedDistrict = aliases[detected] || DISTRICTS.find(item => {
      const option = normalize(item)
      return detected === option || detected.includes(option) || option.includes(detected)
    })
    setForm(current => ({ ...current, ...(address ? { address } : {}), ...(matchedDistrict ? { district: matchedDistrict } : {}) }))
  }

  const reverseGeocode = async ({ latitude, longitude }) => {
    const { data } = await api.get('/api/v1/orders/reverse-geocode', { params: { latitude, longitude } })
    return data.data
  }

  // Verificar RUC cuando tiene 11 dígitos
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

        // Si el usuario ya escribió otro RUC, descartar esta respuesta
        if (currentRucRef.current !== val) return

        setRucStatus('valid')
        setRucData(data.data)

        // Autocompletar nombre si está vacío (usando functional update para evitar closure stale)
        if (data.data?.razonSocial) {
          setForm(f => ({
            ...f,
            ruc: val,
            name: f.name ? f.name : data.data.razonSocial,
          }))
        } else {
          setForm(f => ({ ...f, ruc: val }))
        }
      } catch (err) {
        if (currentRucRef.current !== val) return

        // Mostrar mensaje real del backend si existe
        const msg = err?.response?.data?.message || 'RUC no encontrado o inactivo en SUNAT'
        setRucStatus('invalid')
        setRucErrMsg(msg)
        setForm(f => ({ ...f, ruc: val }))
      }
    } else {
      setRucStatus(null)
    }
  }

  const handleSubmit = async () => {
    if (rucStatus !== 'valid') return
    if (!form.name || !form.category || !form.address || !form.district || !/^\d{8,20}$/.test(form.accountNumber.replace(/\s/g, '')) || form.latitude == null || form.longitude == null) return
    await onSubmit(form)
  }

  const isValid = rucStatus === 'valid' && form.name && form.category && form.address && form.district && /^\d{8,20}$/.test(form.accountNumber.replace(/\s/g, '')) && form.latitude != null && form.longitude != null

  return (
    <div className="rrform">
      <button className="rrform-back" onClick={onBack}>
        <ArrowLeft size={16} /> Volver
      </button>

      <h2 className="rrform-title">Datos del restaurante</h2>
      <p className="rrform-sub">Necesitamos verificar tu RUC con SUNAT</p>

      {/* RUC — campo principal */}
      <div className="rrform-field">
        <label className="rrform-label">RUC *</label>
        <div className="rrform-ruc-wrap">
          <input
            className={`rrform-input rrform-ruc ${
              rucStatus === 'valid'   ? 'rrform-input--valid'   :
              rucStatus === 'invalid' ? 'rrform-input--invalid' : ''
            }`}
            type="text"
            inputMode="numeric"
            placeholder="20123456789"
            value={form.ruc}
            onChange={handleRucChange}
            maxLength={11}
          />
          <span className="rrform-ruc-status">
            {rucStatus === 'checking' && <Loader2 size={18} className="rrform-spinner" />}
            {rucStatus === 'valid'    && <CheckCircle size={18} color="#16a34a" />}
            {rucStatus === 'invalid'  && <XCircle    size={18} color="#dc2626" />}
          </span>
        </div>

        {/* Feedback del RUC */}
        {rucStatus === 'valid' && rucData && (
          <div className="rrform-ruc-ok">
            ✅ <strong>{rucData.razonSocial}</strong> — {rucData.estado}
          </div>
        )}
        {rucStatus === 'invalid' && (
          <div className="rrform-ruc-err">
            ❌ {rucErrMsg}
          </div>
        )}
      </div>

      {/* Nombre */}
      <div className="rrform-field">
        <label className="rrform-label">Nombre del restaurante *</label>
        <input
          className="rrform-input"
          type="text"
          placeholder="Ej: La Cevichería de Carlos"
          value={form.name}
          onChange={set('name')}
        />
      </div>

      {/* Categoría */}
      <div className="rrform-field">
        <label className="rrform-label">Categoría *</label>
        <div className="rrform-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              className={`rrform-cat ${form.category === cat.value ? 'rrform-cat--active' : ''}`}
              onClick={() => setForm(f => ({ ...f, category: cat.value }))}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dirección y distrito */}
      <div className="rrform-row">
        <div className="rrform-field">
          <label className="rrform-label">Dirección *</label>
          <input
            className="rrform-input"
            type="text"
            placeholder="Av. La Mar 770"
            value={form.address}
            onChange={set('address')}
          />
        </div>
        <div className="rrform-field">
          <label className="rrform-label">Distrito *</label>
          <select
            className="rrform-input"
            value={form.district}
            onChange={set('district')}
          >
            <option value="">Seleccionar</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="rrform-field">
        <label className="rrform-label">Referencia <span className="rrform-optional">(opcional)</span></label>
        <input className="rrform-input" type="text" placeholder="Ej: puerta roja, frente al parque" value={form.addressReference} onChange={set('addressReference')}/>
      </div>

      <div className="rrform-field">
        <label className="rrform-label">Ubicación exacta en el mapa *</label>
        <RestaurantLocationPicker
          value={{ latitude: form.latitude, longitude: form.longitude }}
          onChange={coords => setForm(current => ({ ...current, ...coords }))}
          onAddressResolved={fillAddressFromMap}
          reverseGeocode={reverseGeocode}
        />
      </div>

      {/* Teléfono */}
      <div className="rrform-field">
        <label className="rrform-label">
          Teléfono <span className="rrform-optional">(opcional)</span>
        </label>
        <input
          className="rrform-input"
          type="tel"
          placeholder="01 234 5678"
          value={form.phone}
          onChange={set('phone')}
        />
      </div>

      {/* Descripción */}
      <div className="rrform-field">
        <label className="rrform-label">
          Descripción <span className="rrform-optional">(opcional)</span>
        </label>
        <textarea
          className="rrform-input rrform-textarea"
          placeholder="Cuéntanos sobre tu restaurante..."
          value={form.description}
          onChange={set('description')}
          rows={3}
        />
      </div>

      {/* Info de verificación */}
      <div className="rrform-field">
        <label className="rrform-label">Número de cuenta *</label>
        <input className="rrform-input" type="text" inputMode="numeric" maxLength={20}
          placeholder="Entre 8 y 20 dígitos" value={form.accountNumber}
          onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 20) }))}/>
        <small>Cuenta donde recibirás las transferencias de Foodinka.</small>
      </div>

      {/* Info de verificación */}
      <div className="rrform-notice">
        📋 Tu restaurante quedará <strong>pendiente de verificación</strong> por nuestro equipo.
        Te notificaremos por correo cuando esté aprobado.
      </div>

      <button
        className="rrform-submit"
        onClick={handleSubmit}
        disabled={!isValid || loading}
      >
        {loading
          ? <><Loader2 size={18} className="rrform-spinner" /> Enviando...</>
          : '📧 Registrar restaurante'
        }
      </button>
    </div>
  )
}
