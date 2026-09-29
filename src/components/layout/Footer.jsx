import { Mail, MapPin, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand"><Link to="/"><span><Store size={21}/></span> Antojia</Link><p>Restaurantes, sabores y buenos momentos cerca de ti.</p><small><MapPin size={14}/> Lima, Perú</small></div>
        <div><h3>Antojia</h3><Link to="/">Restaurantes</Link><Link to="/orders">Mis pedidos</Link><Link to="/profile">Mi perfil</Link></div>
        <div><h3>Descubre</h3><a href="/#restaurantes">Delivery</a><a href="/#restaurantes">Reservas</a><a href="/#restaurantes">Categorías</a></div>
        <div><h3>Información</h3><a href="mailto:soporte@antojia.com"><Mail size={14}/> Ayuda y soporte</a><span>@antojia.pe</span></div>
      </div>
      <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Antojia</span><span>Hecho para disfrutar Lima.</span></div>
    </footer>
  )
}
