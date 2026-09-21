import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgePercent, Bike, CalendarDays, ChevronRight, Clock3, Sparkles } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce.js'
import { useRestaurants } from '../hooks/useRestaurants.js'
import Navbar from '../components/layout/Navbar.jsx'
import SearchBar from '../components/marketplace/SearchBar.jsx'
import CategoryFilter from '../components/marketplace/CategoryFilter.jsx'
import RestaurantGrid from '../components/marketplace/RestaurantGrid.jsx'
import RestaurantCard from '../components/marketplace/RestaurantCard.jsx'
import Footer from '../components/layout/Footer.jsx'
import './Home.css'
import './HomeMarketplace.css'

const PROMOS = [
  { eyebrow: 'Selección Antójia', title: 'Sabores para cortar la rutina', text: 'Descubre restaurantes con delivery y arma un almuerzo diferente.', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=85', action: 'delivery' },
  { eyebrow: 'Plan de hoy', title: 'Una mesa, una buena conversación', text: 'Explora locales que aceptan reservas.', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=85', action: 'reservation' },
]

export default function Home() {
  const popularRef = useRef(null)
  const [filters, setFilters] = useState({
    category:    '',
    district:    '',
    delivery:    '',
    reservation: '',
    search:      '',
    page:        1,
    limit:       12,
  })

  const debouncedSearch = useDebounce(filters.search, 400)

  const { data, isLoading, isError } = useRestaurants({
    ...filters,
    search: debouncedSearch,
  })

  const restaurants = data?.data               || []
  const total       = data?.pagination?.total  || 0
  const totalPages  = data?.pagination?.totalPages || 1

  const handleFiltersChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1, limit: 12 })
  }

  const handleSearchChange = (value) => {
    setFilters(f => ({ ...f, search: value, page: 1 }))
  }

  const chooseQuickCategory = category => handleFiltersChange({ ...filters, category })
  const applyPromo = action => {
    handleFiltersChange({
      ...filters,
      delivery: action === 'delivery' ? 'true' : '',
      reservation: action === 'reservation' ? 'true' : '',
    })
    requestAnimationFrame(() => {
      document.getElementById('restaurantes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
  const scrollPopular = direction => popularRef.current?.scrollBy({ left: direction * 360, behavior: 'smooth' })

  return (
    <div className="home">
      <Navbar searchValue={filters.search} onSearchChange={handleSearchChange} district={filters.district || 'Lima'} />

      <main>
        <section className="home-hero">
          <div className="home-container home-hero-grid">
            <div className="home-hero-copy">
              <span className="home-eyebrow"><Sparkles size={15}/> Sabores cerca de ti</span>
              <h1>¿Qué se te <span>antoja</span> hoy?</h1>
              <p>Encuentra restaurantes de Lima, pide delivery o reserva tu próxima mesa.</p>
              <div className="home-hero-search"><SearchBar value={filters.search} onChange={handleSearchChange}/></div>
              <div className="home-quick-links"><span>Explora rápido:</span><button onClick={() => chooseQuickCategory('pizzeria')}>Pizza</button><button onClick={() => chooseQuickCategory('chifa')}>Chifa</button><button onClick={() => chooseQuickCategory('fast_food')}>Hamburguesas</button><button onClick={() => chooseQuickCategory('cevicheria')}>Ceviche</button></div>
            </div>
            <div className="home-hero-visual" aria-hidden="true">
              <div className="home-hero-main-photo"><img src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1000&q=90" alt=""/></div>
              <div className="home-hero-side-photo"><img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=88" alt=""/></div>
              <div className="home-hero-note"><span><Clock3 size={17}/></span><div><strong>Opciones para hoy</strong><small>Delivery y reservas</small></div></div>
            </div>
          </div>
        </section>

        <section className="home-categories home-section"><div className="home-container"><div className="home-section-heading"><div><span className="home-kicker">Encuentra tu favorito</span><h2>Elige por categoría</h2></div></div><CategoryFilter filters={filters} onChange={handleFiltersChange} categoriesOnly/></div></section>

        <section className="home-promos home-section"><div className="home-container home-promo-grid">{PROMOS.map((promo, index) => <article className={`home-promo home-promo--${index + 1}`} key={promo.title}><img src={promo.image} alt=""/><div className="home-promo-shade"/><div className="home-promo-content"><span><BadgePercent size={15}/> {promo.eyebrow}</span><h2>{promo.title}</h2><p>{promo.text}</p><button onClick={() => applyPromo(promo.action)}>Explorar ahora <ChevronRight size={16}/></button></div></article>)}</div></section>

        {!isLoading && restaurants.length > 0 && <section className="home-popular home-section"><div className="home-container"><div className="home-section-heading"><div><span className="home-kicker">Lo que Lima está eligiendo</span><h2>Populares cerca de ti</h2></div><div className="home-carousel-controls"><button aria-label="Anterior" onClick={() => scrollPopular(-1)}><ArrowLeft size={18}/></button><button aria-label="Siguiente" onClick={() => scrollPopular(1)}><ArrowRight size={18}/></button></div></div><div className="home-popular-track" ref={popularRef}>{restaurants.slice(0, 8).map(restaurant => <div className="home-popular-card" key={restaurant.id}><RestaurantCard restaurant={restaurant}/></div>)}</div></div></section>}

        <section className="home-catalog home-section" id="restaurantes"><div className="home-container"><div className="home-section-heading home-catalog-heading"><div><span className="home-kicker">Todo en un solo lugar</span><h2>Restaurantes para cada antojo</h2><p>Filtra por modalidad o distrito y encuentra tu próxima comida.</p></div><div className="home-service-notes"><span><Bike size={16}/> Delivery</span><span><CalendarDays size={16}/> Reservas</span></div></div><CategoryFilter filters={filters} onChange={handleFiltersChange} filtersOnly/><div className="home-grid-wrap"><RestaurantGrid restaurants={restaurants} isLoading={isLoading} isError={isError} total={total}/>{!isLoading && totalPages > 1 && <div className="home-pagination"><button className="home-page-btn" onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={filters.page <= 1}><ArrowLeft size={16}/> Anterior</button><span className="home-page-info">Página {filters.page} de {totalPages}</span><button className="home-page-btn" onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={filters.page >= totalPages}>Siguiente <ArrowRight size={16}/></button></div>}</div></div></section>

        <section className="home-brand-banner"><div className="home-container"><div><span>Hecho para Lima</span><h2>Tu próximo favorito puede estar a unas cuadras.</h2></div><a href="#restaurantes">Ver todos los restaurantes <ArrowRight size={18}/></a></div></section>
      </main>
      <Footer/>
    </div>
  )
}
