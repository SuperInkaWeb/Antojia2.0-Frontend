import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import toast from 'react-hot-toast'
import {
  User, Store, Bike, Pencil, Check, X,
  Plus, Trash2, CircleCheck, CircleX, ChefHat,
  Loader2, ShoppingBag,
} from 'lucide-react'
import Navbar from '../components/layout/Navbar.jsx'
import LogoUploader from '../components/ui/LogoUploader.jsx'
import ImageUploader from '../components/ui/ImageUploader.jsx'
import RestaurantLocationPicker from '../components/restaurant/RestaurantLocationPicker.jsx'
import { useCurrentUser } from '../hooks/useCurrentUser.js'
import {
  useUpdateProfile, useUpdateRestaurant,
  useRestaurantProducts, useRestaurantCategories, useCreateCategory, useCreateProduct,
  useUpdateProduct, useDeleteProduct, useToggleProduct,
  useUpdateDriverVehicle,
} from '../hooks/useProfile.js'
import './Profile.css'

// ─── Constantes ────────────────────────────────────────────────────
const VEHICLE_TYPES = [
  { value: 'MOTORCYCLE', label: '🏍️ Moto'     },
  { value: 'BICYCLE',    label: '🚲 Bicicleta' },
  { value: 'CAR',        label: '🚗 Auto'       },
  { value: 'WALKING',    label: '🚶 A pie'      },
]
const PRODUCT_TYPES = [
  { value: 'DISH',  label: '🍽️ Plato'  },
  { value: 'DRINK', label: '🥤 Bebida' },
  { value: 'COMBO', label: '📦 Combo'  },
]
const DRIVER_STATUS_LABEL = {
  OFFLINE:   { label: 'Desconectado', color: '#9ca3af' },
  AVAILABLE: { label: 'Disponible',   color: '#16a34a' },
  BUSY:      { label: 'En entrega',   color: '#c2410c' },
}

// ─── Campo editable inline ─────────────────────────────────────────
function EditableField({ label, value, onSave, saving, type = 'text', placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value || '')
  useEffect(() => { setDraft(value || '') }, [value])

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return }
    await onSave(draft)
    setEditing(false)
  }
  return (
    <div className="pf-field">
      <label className="pf-field-label">{label}</label>
      {editing ? (
        <div className="pf-field-edit">
          <input className="pf-input" type={type} value={draft} autoFocus
            placeholder={placeholder}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') { setEditing(false); setDraft(value || '') }
            }}
          />
          <button className="pf-icon-btn pf-save" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={15} className="pf-spin"/> : <Check size={15}/>}
          </button>
          <button className="pf-icon-btn pf-cancel" onClick={() => { setEditing(false); setDraft(value || '') }}>
            <X size={15}/>
          </button>
        </div>
      ) : (
        <div className="pf-field-val">
          <span>{value || <span className="pf-empty">Sin definir</span>}</span>
          <button className="pf-icon-btn pf-edit" onClick={() => setEditing(true)}><Pencil size={13}/></button>
        </div>
      )}
    </div>
  )
}

// ─── Modal de producto ─────────────────────────────────────────────
function ProductModal({ restaurantId, product, onClose }) {
  const isEdit = !!product
  const create = useCreateProduct(restaurantId)
  const update = useUpdateProduct(restaurantId)
  const { data: categories = [], isLoading: categoriesLoading } = useRestaurantCategories(restaurantId)
  const createCategory = useCreateCategory(restaurantId)
  const saving = create.isPending || update.isPending
  const [newCategory, setNewCategory] = useState('')
  const [form, setForm] = useState({
    name: product?.name || '', description: product?.description || '',
    type: product?.type || 'DISH', price: product?.price || '', imageUrl: product?.imageUrl || '',
    categoryId: product?.category?.id || '',
  })
  const set = f => e => setForm(v => ({ ...v, [f]: e.target.value }))

  const handleSubmit = async () => {
    const payload = {
      ...form,
      price: parseFloat(form.price),
      categoryId: form.categoryId || undefined,
    }
    if (isEdit) await update.mutateAsync({ id: product.id, ...payload })
    else        await create.mutateAsync(payload)
    onClose()
  }

  const handleCreateCategory = async () => {
    const name = newCategory.trim()
    if (!name || createCategory.isPending) return
    const category = await createCategory.mutateAsync(name)
    setForm(value => ({ ...value, categoryId: category.id }))
    setNewCategory('')
  }
  return (
    <div className="pf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pf-modal">
        <div className="pf-modal-head">
          <h3>{isEdit ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button className="pf-icon-btn" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="pf-modal-body">
          <div className="pf-field">
            <label className="pf-field-label">Tipo</label>
            <div className="pf-type-btns">
              {PRODUCT_TYPES.map(t => (
                <button key={t.value} className={`pf-type-btn ${form.type === t.value ? 'active' : ''}`}
                  onClick={() => setForm(v => ({ ...v, type: t.value }))}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="pf-field">
            <label className="pf-field-label">Categoría del menú</label>
            <select
              className="pf-input pf-select"
              value={form.categoryId}
              onChange={set('categoryId')}
              disabled={categoriesLoading}
            >
              <option value="">Menú general</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <div className="pf-new-category">
              <input
                className="pf-input"
                value={newCategory}
                onChange={event => setNewCategory(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleCreateCategory()
                  }
                }}
                placeholder="Ej: Entradas, Platos principales..."
                maxLength={50}
              />
              <button
                type="button"
                className="pf-btn-category"
                onClick={handleCreateCategory}
                disabled={!newCategory.trim() || createCategory.isPending}
              >
                {createCategory.isPending ? <Loader2 size={14} className="pf-spin" /> : <Plus size={14} />}
                Crear
              </button>
            </div>
            <p className="pf-field-help">Organiza tus productos en secciones visibles para tus clientes.</p>
          </div>
          <div className="pf-field">
            <label className="pf-field-label">Nombre *</label>
            <input className="pf-input" value={form.name} onChange={set('name')} placeholder="Ej: Lomo Saltado"/>
          </div>
          <div className="pf-field">
            <label className="pf-field-label">Descripción</label>
            <textarea className="pf-input pf-textarea" rows={2} value={form.description} onChange={set('description')} placeholder="Ingredientes, preparación..."/>
          </div>
          <div className="pf-field">
            <label className="pf-field-label">Precio (S/) *</label>
            <input className="pf-input" type="number" min="0" step="0.5" value={form.price} onChange={set('price')} placeholder="0.00"/>
          </div>
          <div className="pf-field">
            <label className="pf-field-label">URL de imagen</label>
            <input className="pf-input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..."/>
          </div>
        </div>
        <div className="pf-modal-foot">
          <button className="pf-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="pf-btn-primary" onClick={handleSubmit} disabled={!form.name || !form.price || saving}>
            {saving ? <><Loader2 size={15} className="pf-spin"/> Guardando...</> : isEdit ? 'Guardar cambios' : 'Añadir al menú'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sección datos personales ──────────────────────────────────────
function SectionUser({ user }) {
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile()
  return (
    <div className="pf-section">
      <div className="pf-section-title"><User size={15}/> Datos personales</div>
      <EditableField label="Nombre" value={user.name} saving={isPending}
        placeholder="Tu nombre completo" onSave={name => updateProfile({ name })}/>
      <EditableField label="Teléfono" value={user.phone} saving={isPending}
        placeholder="9XXXXXXXX" type="tel" onSave={phone => updateProfile({ phone })}/>
      <div className="pf-field">
        <label className="pf-field-label">Correo</label>
        <div className="pf-field-val pf-field-val--readonly"><span>{user.email}</span></div>
      </div>
      <div className="pf-field">
        <label className="pf-field-label">Rol</label>
        <div className="pf-field-val pf-field-val--readonly">
          <span className="pf-role-badge">
            {user.role === 'RESTAURANT_OWNER' ? '🍽️ Dueño de restaurante' :
             user.role === 'DELIVERY'         ? '🏍️ Repartidor'           :
             user.role === 'ADMIN'            ? '⚙️ Administrador'         : '🛒 Cliente'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Sección restaurante (con logo uploader) ───────────────────────
export function SectionRestaurant({ restaurant }) {
  const { mutateAsync: update, isPending } = useUpdateRestaurant(restaurant.id)
  const [deliveryEnabled, setDeliveryEnabled] = useState(restaurant.isDeliveryEnabled !== false)
  const [reservationEnabled, setReservationEnabled] = useState(restaurant.isReservationEnabled !== false)

  useEffect(() => {
    setDeliveryEnabled(restaurant.isDeliveryEnabled !== false)
    setReservationEnabled(restaurant.isReservationEnabled !== false)
  }, [restaurant.isDeliveryEnabled, restaurant.isReservationEnabled])

  const updateService = async (service, enabled) => {
    const nextDelivery = service === 'delivery' ? enabled : deliveryEnabled
    const nextReservation = service === 'reservation' ? enabled : reservationEnabled
    if (!nextDelivery && !nextReservation) {
      toast.error('Mantén activo delivery o reservas')
      return
    }
    await update(service === 'delivery'
      ? { isDeliveryEnabled: enabled }
      : { isReservationEnabled: enabled })
    if (service === 'delivery') setDeliveryEnabled(enabled)
    else setReservationEnabled(enabled)
  }

  const handleLogoUploaded = async (logoUrl) => {
    await update({ logoUrl })
  }

  return (
    <div className="pf-section">
      <div className="pf-section-title"><Store size={15}/> Mi restaurante</div>

      <div className={`pf-restaurant-status pf-restaurant-status--${restaurant.status?.toLowerCase()}`}>
        {restaurant.status === 'ACTIVE'    ? '✅ Activo — visible para los clientes' :
         restaurant.status === 'PENDING_VERIFICATION' ? '⏳ Pendiente de verificación por Foodinka' :
         restaurant.status === 'SUSPENDED' ? '🚫 Suspendido' : restaurant.status}
      </div>

      <div className="pf-service-settings">
        <div>
          <label className="pf-field-label">Servicios activos</label>
          <p className="pf-field-help">Elige qué modalidades puede usar tu restaurante.</p>
        </div>
        <div className="pf-service-options">
          <label className={`pf-service-option ${deliveryEnabled ? 'pf-service-option--active' : ''}`}>
            <input type="checkbox" checked={deliveryEnabled} disabled={isPending}
              onChange={e => updateService('delivery', e.target.checked)} />
            <span><strong>🛵 Delivery</strong><small>Recibe pedidos de entrega.</small></span>
          </label>
          <label className={`pf-service-option ${reservationEnabled ? 'pf-service-option--active' : ''}`}>
            <input type="checkbox" checked={reservationEnabled} disabled={isPending}
              onChange={e => updateService('reservation', e.target.checked)} />
            <span><strong>📅 Reservas</strong><small>Acepta reservas de mesas.</small></span>
          </label>
        </div>
      </div>

      {/* Logo */}
      <div className="pf-field">
        <label className="pf-field-label">Logo del restaurante</label>
        <div className="pf-logo-row">
          <LogoUploader
            currentUrl={restaurant.logoUrl}
            restaurantId={restaurant.id}
            onUploaded={handleLogoUploaded}
            size="md"
          />
          <div className="pf-logo-hint">
            <p>Sube el logo de tu restaurante.</p>
            <p>Aparecerá en la tarjeta del marketplace.</p>
            <p className="pf-logo-hint-sub">PNG o JPG · máx 5 MB · recomendado 400×400 px</p>
          </div>
        </div>
      </div>

      <div className="pf-field">
        <label className="pf-field-label">Fondo del restaurante</label>
        <ImageUploader
          value={restaurant.bannerUrl}
          onUploaded={bannerUrl => update({ bannerUrl })}
          scope="restaurants/banners"
          label="Subir fondo del restaurante"
        />
        <p className="pf-field-help">Si no colocas uno, se mostrará el fondo predeterminado.</p>
      </div>

      <EditableField label="Nombre del restaurante" value={restaurant.name} saving={isPending}
        placeholder="Nombre de tu negocio" onSave={name => update({ name })}/>
      <EditableField label="Descripción" value={restaurant.description} saving={isPending}
        placeholder="Cuéntanos sobre tu restaurante" onSave={description => update({ description })}/>
      <EditableField label="Dirección" value={restaurant.address} saving={isPending}
        placeholder="Dirección del local" onSave={address => update({ address })}/>
      <EditableField label="Referencia" value={restaurant.addressReference} saving={isPending}
        placeholder="Ej: puerta roja, frente al parque" onSave={addressReference => update({ addressReference })}/>
      <div className="pf-field">
        <label className="pf-field-label">Ubicación exacta para el recojo</label>
        <RestaurantLocationPicker value={{ latitude: restaurant.latitude, longitude: restaurant.longitude }} onChange={coords => update(coords)}/>
      </div>
      <EditableField label="Teléfono" value={restaurant.phone} saving={isPending}
        placeholder="01 234 5678" type="tel" onSave={phone => update({ phone })}/>
      <BankAccountField value={restaurant.bankAccountNumberMasked} saving={isPending}
        onSave={accountNumber => update({ accountNumber })}/>
      <EditableField label="Costo de delivery (S/)" value={restaurant.deliveryFee?.toString()} saving={isPending}
        placeholder="0.00" type="number" onSave={v => update({ deliveryFee: parseFloat(v) || 0 })}/>
      <EditableField label="Tiempo estimado (min)" value={restaurant.estimatedTime?.toString()} saving={isPending}
        placeholder="30" type="number" onSave={v => update({ estimatedTime: parseInt(v) || 30 })}/>
    </div>
  )
}

// ─── Sección menú ──────────────────────────────────────────────────
export function SectionMenu({ restaurant }) {
  const { data: products = [], isLoading } = useRestaurantProducts(restaurant.id)
  const deleteProduct = useDeleteProduct(restaurant.id)
  const toggleProduct = useToggleProduct(restaurant.id)
  const [modal,         setModal]         = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const grouped   = products.reduce((acc, p) => { (acc[p.type] = acc[p.type] || []).push(p); return acc }, {})
  const typeLabel = { DISH: '🍽️ Platos', DRINK: '🥤 Bebidas', COMBO: '📦 Combos' }
  return (
    <div className="pf-section">
      <div className="pf-section-title-row">
        <div className="pf-section-title"><ChefHat size={15}/> Menú</div>
        <button className="pf-btn-add" onClick={() => setModal('new')}><Plus size={14}/> Agregar</button>
      </div>
      {isLoading && <div className="pf-loading"><Loader2 size={20} className="pf-spin"/> Cargando menú...</div>}
      {!isLoading && products.length === 0 && (
        <div className="pf-menu-empty"><ShoppingBag size={32} strokeWidth={1.5}/><p>Aún no tienes productos. ¡Agrega el primero!</p></div>
      )}
      {!isLoading && Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="pf-menu-group">
          <p className="pf-menu-group-title">{typeLabel[type] || type}</p>
          {items.map(product => (
            <div key={product.id} className={`pf-product-row ${!product.isAvailable ? 'pf-product-row--off' : ''}`}>
              {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="pf-product-img"/>}
              <div className="pf-product-info">
                <p className="pf-product-name">{product.name}</p>
                {product.description && <p className="pf-product-desc">{product.description}</p>}
                <p className="pf-product-price">S/ {product.price?.toFixed(2)}</p>
              </div>
              <div className="pf-product-actions">
                <button className={`pf-icon-btn ${product.isAvailable ? 'pf-available' : 'pf-unavailable'}`}
                  onClick={() => toggleProduct.mutate({ id: product.id, isAvailable: !product.isAvailable })} disabled={toggleProduct.isPending}
                  title={product.isAvailable ? 'Ocultar para consumidores' : 'Mostrar para consumidores'}
                  aria-label={product.isAvailable ? 'Ocultar producto para consumidores' : 'Mostrar producto para consumidores'}>
                  {product.isAvailable ? <CircleCheck size={16}/> : <CircleX size={16}/>}
                </button>
                <button className="pf-icon-btn pf-edit" onClick={() => setModal(product)}><Pencil size={14}/></button>
                <button className="pf-icon-btn pf-delete" onClick={() => setConfirmDelete(product)}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      ))}
      {modal && <ProductModal restaurantId={restaurant.id} product={modal === 'new' ? null : modal} onClose={() => setModal(null)}/>}
      {confirmDelete && (
        <div className="pf-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="pf-confirm" onClick={e => e.stopPropagation()}>
            <p>¿Eliminar <strong>{confirmDelete.name}</strong>?</p>
            <div className="pf-confirm-btns">
              <button className="pf-btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="pf-btn-danger" onClick={() => { deleteProduct.mutate(confirmDelete.id); setConfirmDelete(null) }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sección repartidor ────────────────────────────────────────────
function SectionDriver({ driver }) {
  const { mutateAsync: updateVehicle, isPending } = useUpdateDriverVehicle()
  const [vehicleType,  setVehicleType]  = useState(driver?.vehicleType  || 'MOTORCYCLE')
  const [licensePlate, setLicensePlate] = useState(driver?.licensePlate || '')
  const [editing,      setEditing]      = useState(false)
  useEffect(() => {
    setVehicleType(driver?.vehicleType   || 'MOTORCYCLE')
    setLicensePlate(driver?.licensePlate || '')
  }, [driver?.vehicleType, driver?.licensePlate])

  const statusCfg = DRIVER_STATUS_LABEL[driver?.status] || DRIVER_STATUS_LABEL.OFFLINE

  const handleSave = async () => {
    await updateVehicle({ vehicleType, licensePlate: licensePlate || null })
    setEditing(false)
  }
  const handleCancel = () => {
    setVehicleType(driver?.vehicleType   || 'MOTORCYCLE')
    setLicensePlate(driver?.licensePlate || '')
    setEditing(false)
  }
  return (
    <div className="pf-section">
      <div className="pf-section-title"><Bike size={15}/> Mi perfil de repartidor</div>
      <div className="pf-driver-status" style={{ color: statusCfg.color }}>
        <span className="pf-driver-dot" style={{ background: statusCfg.color }}/>
        {statusCfg.label}
        {!driver?.isVerified && <span className="pf-driver-unverified"> · Pendiente de verificación</span>}
      </div>
      {driver?.dni && (
        <div className="pf-field">
          <label className="pf-field-label">DNI</label>
          <div className="pf-field-val pf-field-val--readonly"><span>{driver.dni}</span></div>
        </div>
      )}
      {driver?.licenseNumber && (
        <div className="pf-field">
          <label className="pf-field-label">N° carné de conducir</label>
          <div className="pf-field-val pf-field-val--readonly"><span>{driver.licenseNumber}</span></div>
        </div>
      )}
      <BankAccountField value={driver?.bankAccountNumberMasked} saving={isPending}
        onSave={accountNumber => updateVehicle({ accountNumber })}/>
      <div className="pf-field">
        <label className="pf-field-label">Tipo de vehículo</label>
        {!editing ? (
          <div className="pf-field-val">
            <span>
              {VEHICLE_TYPES.find(v => v.value === driver?.vehicleType)?.label || 'Sin definir'}
              {driver?.licensePlate ? ` · ${driver.licensePlate}` : ''}
            </span>
            <button className="pf-icon-btn pf-edit" onClick={() => setEditing(true)}><Pencil size={13}/></button>
          </div>
        ) : (
          <div className="pf-vehicle-edit">
            <div className="pf-vehicle-types">
              {VEHICLE_TYPES.map(v => (
                <button key={v.value} className={`pf-type-btn ${vehicleType === v.value ? 'active' : ''}`}
                  onClick={() => setVehicleType(v.value)}>{v.label}</button>
              ))}
            </div>
            <input className="pf-input" placeholder="Placa (opcional, ej: ABC-123)"
              value={licensePlate} maxLength={10}
              onChange={e => setLicensePlate(e.target.value.toUpperCase())}/>
            <div className="pf-vehicle-btns">
              <button className="pf-btn-secondary" onClick={handleCancel} disabled={isPending}>Cancelar</button>
              <button className="pf-btn-primary" onClick={handleSave} disabled={isPending}>
                {isPending ? <><Loader2 size={14} className="pf-spin"/> Guardando...</> : <><Check size={14}/> Guardar</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────
export default function Profile() {
  const { isAuthenticated, loginWithRedirect, user: auth0User } = useAuth0()
  const { data: user, isLoading } = useCurrentUser()
  const role              = user?.role
  const isRestaurantOwner = role === 'RESTAURANT_OWNER'
  const isDriver          = role === 'DELIVERY'
  const driverProfile     = user?.driverProfile

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="pf"><Navbar />
        <div className="pf-gate">
          <User size={44} strokeWidth={1.5}/>
          <h2>Inicia sesión para ver tu perfil</h2>
          <button className="pf-btn-primary" onClick={() => loginWithRedirect()}>Iniciar sesión</button>
        </div>
      </div>
    )
  }

  return (
    <div className="pf">
      <Navbar />
      <div className="pf-inner">
        <div className="pf-hero">
          <div className="pf-avatar">
            {auth0User?.picture ? <img src={auth0User.picture} alt={user?.name}/> : <User size={28}/>}
          </div>
          <div>
            <h1 className="pf-hero-name">{user?.name || '—'}</h1>
            <p className="pf-hero-email">{user?.email}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="pf-loading"><Loader2 size={24} className="pf-spin"/> Cargando perfil...</div>
        ) : (
          <div className="pf-sections">
            <SectionUser user={user} />
            {isRestaurantOwner && user.restaurant && (
              <>
                <SectionRestaurant restaurant={user.restaurant} />
                <SectionMenu restaurant={user.restaurant} />
              </>
            )}
            {isDriver && <SectionDriver driver={driverProfile} />}
          </div>
        )}
      </div>
    </div>
  )
}

function BankAccountField({ value, onSave, saving }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const valid = /^\d{8,20}$/.test(draft)
  const handleSave = async () => {
    if (!valid) return
    await onSave(draft)
    setDraft('')
    setEditing(false)
  }
  return (
    <div className="pf-field">
      <label className="pf-field-label">Número de cuenta para transferencias</label>
      {editing ? (
        <div className="pf-field-edit">
          <input className="pf-input" type="text" inputMode="numeric" maxLength={20} autoFocus
            placeholder="Entre 8 y 20 dígitos" value={draft}
            onChange={e => setDraft(e.target.value.replace(/\D/g, '').slice(0, 20))}/>
          <button className="pf-icon-btn pf-save" onClick={handleSave} disabled={saving || !valid}>
            {saving ? <Loader2 size={15} className="pf-spin"/> : <Check size={15}/>}
          </button>
          <button className="pf-icon-btn pf-cancel" onClick={() => { setEditing(false); setDraft('') }}><X size={15}/></button>
        </div>
      ) : (
        <div className="pf-field-val">
          <span>{value || <span className="pf-empty">Sin configurar</span>}</span>
          <button className="pf-icon-btn pf-edit" onClick={() => setEditing(true)}><Pencil size={13}/></button>
        </div>
      )}
      <small>Se muestra enmascarada por seguridad.</small>
    </div>
  )
}
