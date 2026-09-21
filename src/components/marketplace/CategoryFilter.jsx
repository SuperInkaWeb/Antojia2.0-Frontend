import './CategoryFilter.css'

const CATEGORIES = [
  { value: '',            label: 'Todos',       emoji: '🍽️' },
  { value: 'cevicheria',  label: 'Cevichería',  emoji: '🐟' },
  { value: 'chifa',       label: 'Chifa',       emoji: '🍜' },
  { value: 'fast_food',   label: 'Fast Food',   emoji: '🍔' },
  { value: 'pizzeria',    label: 'Pizzería',    emoji: '🍕' },
  { value: 'parrilla',    label: 'Parrilla',    emoji: '🥩' },
  { value: 'heladeria',   label: 'Heladería',   emoji: '🍦' },
  { value: 'cafe',        label: 'Café',        emoji: '☕' },
  { value: 'buffet',      label: 'Buffet',      emoji: '🥗' },
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

export default function CategoryFilter({ filters, onChange, categoriesOnly = false, filtersOnly = false }) {

  const handleCategory = (value) => {
    onChange({ ...filters, category: value })
  }

  const handleDistrict = (e) => {
    onChange({ ...filters, district: e.target.value })
  }

  const handleDelivery = () => {
    onChange({ ...filters, delivery: filters.delivery ? '' : 'true' })
  }

  const handleReservation = () => {
    onChange({ ...filters, reservation: filters.reservation ? '' : 'true' })
  }

  const hasActiveFilters =
    filters.district || filters.delivery || filters.reservation

  const clearAll = () => {
    onChange({ category: filters.category, search: filters.search })
  }

  return (
    <div className="catfilter">

      {/* Chips de categoría */}
      {!filtersOnly && <div className="catfilter-chips">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`catfilter-chip ${filters.category === cat.value ? 'catfilter-chip--active' : ''}`}
            onClick={() => handleCategory(cat.value)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>}

      {/* Filtros secundarios */}
      {!categoriesOnly && <div className="catfilter-secondary">

        {/* Distrito */}
        <select
          className={`catfilter-select ${filters.district ? 'catfilter-select--active' : ''}`}
          value={filters.district || ''}
          onChange={handleDistrict}
        >
          <option value="">📍 Todos los distritos</option>
          {DISTRICTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Toggle delivery */}
        <button
          className={`catfilter-toggle ${filters.delivery ? 'catfilter-toggle--active' : ''}`}
          onClick={handleDelivery}
        >
          🛵 Delivery
        </button>

        {/* Toggle reservas */}
        <button
          className={`catfilter-toggle ${filters.reservation ? 'catfilter-toggle--active' : ''}`}
          onClick={handleReservation}
        >
          📅 Reservas
        </button>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <button className="catfilter-clear" onClick={clearAll}>
            Limpiar filtros
          </button>
        )}

      </div>}
    </div>
  )
}
