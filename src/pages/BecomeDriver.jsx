import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi.js'
import Navbar from '../components/layout/Navbar.jsx'
import ImageUploader from '../components/ui/ImageUploader.jsx'
import './BecomeDriver.css'

const VEHICLE_TYPES = [
  { value: 'MOTORCYCLE', label: '🏍️ Moto' },
  { value: 'BICYCLE',    label: '🚲 Bicicleta' },
  { value: 'CAR',        label: '🚗 Auto' },
  { value: 'ON_FOOT',    label: '🚶 A pie' },
]

export default function BecomeDriver() {
  const navigate  = useNavigate()
  const api       = useApi()
  const { user }  = useAuth0()
  const [loading, setLoading]   = useState(false)
  const [done,    setDone]      = useState(false)

  const [form, setForm] = useState({
    vehicleType:     'MOTORCYCLE',
    licensePlate:    '',
    dni:             '',
    licenseNumber:   '',
    licensePhotoUrl: '',
    dniPhotoUrl:     '',
    vehiclePhotoUrl: '',
    accountNumber: '',
  })

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const requiresLicense = ['MOTORCYCLE', 'CAR'].includes(form.vehicleType)

  const handleSubmit = async () => {
    if (!/^\d{8}$/.test(form.dni)) return toast.error('El DNI debe tener exactamente 8 dígitos')
    if (!/^\d{8,20}$/.test(form.accountNumber.replace(/\s/g, ''))) return toast.error('El número de cuenta es requerido y debe tener entre 8 y 20 dígitos')
    if (requiresLicense && !form.licenseNumber.trim())   return toast.error('El número de carné de conducir es requerido')
    if (requiresLicense && !form.licensePhotoUrl.trim()) return toast.error('La URL de la foto del carné es requerida')

    setLoading(true)
    try {
      await api.post('/api/v1/drivers/register', form)
      setDone(true)
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al enviar solicitud'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="bdriver">
      <Navbar />
      <div className="bdriver-done">
        <CheckCircle size={56} color="#16a34a" strokeWidth={1.5} />
        <h2>¡Solicitud enviada!</h2>
        <p>El administrador revisará tu carné de conducir y DNI. Te notificaremos cuando tu perfil esté aprobado.</p>
        <button className="bdriver-btn" onClick={() => navigate('/')}>Ir al inicio</button>
      </div>
    </div>
  )

  return (
    <div className="bdriver">
      <Navbar />
      <div className="bdriver-inner">
        <button className="bdriver-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="bdriver-header">
          <h1>Conviértete en repartidor</h1>
          <p>Gana dinero entregando pedidos en tu zona. Necesitamos verificar tu identidad y carné de conducir.</p>
        </div>

        <div className="bdriver-card">
          <h2 className="bdriver-section">1. Tipo de vehículo</h2>
          <div className="bdriver-vehicles">
            {VEHICLE_TYPES.map(v => (
              <button
                key={v.value}
                className={`bdriver-vehicle ${form.vehicleType === v.value ? 'bdriver-vehicle--active' : ''}`}
                onClick={() => setForm(f => ({ ...f, vehicleType: v.value }))}
              >
                {v.label}
              </button>
            ))}
          </div>

          {['MOTORCYCLE', 'CAR'].includes(form.vehicleType) && (
            <div className="bdriver-field">
              <label>Placa del vehículo</label>
              <input className="bdriver-input" placeholder="ABC-123" value={form.licensePlate} onChange={set('licensePlate')} />
            </div>
          )}
        </div>

        <div className="bdriver-card">
          <h2 className="bdriver-section">Datos para transferencias</h2>
          <div className="bdriver-field">
            <label>Número de cuenta *</label>
            <input className="bdriver-input" type="text" inputMode="numeric" maxLength={20}
              placeholder="Entre 8 y 20 dígitos" value={form.accountNumber}
              onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 20) }))}/>
            <small className="bdriver-hint">Se usará para transferirte tus ganancias.</small>
          </div>
        </div>

        <div className="bdriver-card">
          <h2 className="bdriver-section">2. Documentos de identidad</h2>

          <div className="bdriver-field">
            <label>DNI *</label>
            <input className="bdriver-input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="12345678" maxLength={8} value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))} />
          </div>

          <div className="bdriver-field">
            <label>Foto del DNI <span className="bdriver-hint">(opcional)</span></label>
            <ImageUploader value={form.dniPhotoUrl} onUploaded={url => setForm(f => ({ ...f, dniPhotoUrl: url }))} scope="drivers/dni" label="Adjuntar foto del DNI" />
          </div>
        </div>

        {requiresLicense && (
          <div className="bdriver-card">
            <h2 className="bdriver-section">3. Carné de conducir *</h2>

            <div className="bdriver-notice">
              🪪 El carné de conducir es obligatorio para poder tomar pedidos de delivery.
            </div>

            <div className="bdriver-field">
              <label>Número del carné de conducir *</label>
              <input className="bdriver-input" placeholder="Q12345678" value={form.licenseNumber} onChange={set('licenseNumber')} />
            </div>

            <div className="bdriver-field">
              <label>Foto del carné *</label>
              <ImageUploader value={form.licensePhotoUrl} onUploaded={url => setForm(f => ({ ...f, licensePhotoUrl: url }))} scope="drivers/licenses" label="Adjuntar foto del carné" />
            </div>

            <div className="bdriver-field">
              <label>Foto del vehículo <span className="bdriver-hint">(opcional)</span></label>
              <ImageUploader value={form.vehiclePhotoUrl} onUploaded={url => setForm(f => ({ ...f, vehiclePhotoUrl: url }))} scope="drivers/vehicles" label="Adjuntar foto del vehículo" />
            </div>
          </div>
        )}

        {!requiresLicense && form.vehicleType === 'BICYCLE' && (
          <div className="bdriver-card">
            <h2 className="bdriver-section">3. Foto del vehículo</h2>
            <div className="bdriver-field">
              <label>Foto del vehículo <span className="bdriver-hint">(opcional)</span></label>
              <ImageUploader value={form.vehiclePhotoUrl} onUploaded={url => setForm(f => ({ ...f, vehiclePhotoUrl: url }))} scope="drivers/vehicles" label="Adjuntar foto del vehículo" />
            </div>
          </div>
        )}

        <button className="bdriver-submit" onClick={handleSubmit} disabled={loading}>
          {loading
            ? <><Loader2 size={18} className="bdriver-spinner" /> Enviando...</>
            : '🛵 Enviar solicitud'
          }
        </button>
      </div>
    </div>
  )
}
