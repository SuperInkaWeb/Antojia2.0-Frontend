import './CheckoutForm.css'

export const DELIVERY_DISTRICTS = [
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

export default function DeliveryForm({
  address, onAddressChange,
  district, onDistrictChange,
  phone, onPhoneChange,
  notes, onNotesChange,
}) {
  return (
    <div className="chkform">

      <div className="chkform-field">
        <label className="chkform-label">Dirección de entrega *</label>
        <input
          className="chkform-input"
          type="text"
          placeholder="Av. La Mar 123, Dpto 4B"
          value={address}
          onChange={e => onAddressChange(e.target.value)}
        />
      </div>

      <div className="chkform-field">
        <label className="chkform-label">Distrito *</label>
        <select
          className="chkform-input"
          value={district}
          onChange={e => onDistrictChange(e.target.value)}
        >
          <option value="">Selecciona un distrito</option>
          {DELIVERY_DISTRICTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="chkform-field">
        <label className="chkform-label">Teléfono de contacto *</label>
        <input
          className="chkform-input"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="987654321"
          value={phone}
          onChange={e => onPhoneChange(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="chkform-field">
        <label className="chkform-label">
          Referencia <span className="chkform-optional">(opcional)</span>
        </label>
        <input
          className="chkform-input"
          type="text"
          placeholder="Frente al parque, portón azul..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
        />
      </div>

    </div>
  )
}
