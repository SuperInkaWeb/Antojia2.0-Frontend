# 🍽️ Antojia — Frontend

Interfaz SPA del marketplace gastronómico **Antojia**, construida con React 19,
Vite y TanStack Query. Consume el backend desplegado en Render y se publica en
Vercel.

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | UI |
| Vite | 8.x | Bundler y dev server |
| React Router | 7.x | Navegación SPA |
| TanStack Query | 5.x | Fetching, caché y sincronización |
| Auth0 React SDK | 2.x | Autenticación |
| Zustand | 5.x | Estado global (carrito) |
| Lucide React | 1.x | Iconografía |
| Axios | 1.x | Cliente HTTP |
| React Hot Toast | 2.x | Notificaciones |

---

## 📁 Estructura del proyecto

```
frontend/
├── public/
│   ├── favicon.jpeg           # Ícono de la app (logo A)
│   ├── logo.jpeg              # Logo completo Antojia
│   └── _redirects             # Compatibilidad con despliegues alternativos
├── src/
│   ├── App.jsx                # Rutas de la aplicación
│   ├── config/api.js          # Instancia Axios + interceptores
│   ├── store/cartStore.js     # Zustand — carrito (localStorage: antojia-cart)
│   ├── hooks/
│   │   ├── useCurrentUser.js
│   │   ├── useRestaurants.js
│   │   ├── useOrders.js
│   │   ├── useRestaurantOrders.js
│   │   ├── useProfile.js
│   │   ├── useAdmin.js         # Operaciones de administración
│   │   ├── useReports.js       # Reportes de usuarios y soporte técnico
│   │   └── useOnboarding.js    # Flujo de incorporación por rol
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── RestaurantDetail.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── MyOrders.jsx
│   │   ├── OrderDetail.jsx
│   │   ├── Profile.jsx
│   │   ├── Onboarding.jsx
│   │   ├── BecomeDriver.jsx
│   │   ├── DriverDashboard.jsx
│   │   ├── RestaurantDashboard.jsx
│   │   ├── RegisterRestaurant.jsx
│   │   ├── Callback.jsx
│   │   └── admin/Dashboard.jsx
│   └── components/
│       ├── layout/Navbar.jsx
│       ├── marketplace/RestaurantCard.jsx
│       ├── restaurant/RestaurantHeader.jsx
│       ├── orders/OrderStatusBadge.jsx
│       ├── ui/LogoUploader.jsx
│       ├── ui/ImageUploader.jsx
│       ├── delivery/            # Seguimiento y prueba de entrega
│       └── admin/                # Paneles admin, marketing, técnico y financiero
└── index.html
```

---

## 🚀 Instalación y desarrollo

### 1. Requisitos previos
- Node.js ≥ 22
- Backend de Antojia corriendo en `http://localhost:4000`
- Cuenta en [Auth0](https://auth0.com)

### 2. Instalar dependencias
```bash
cd frontend
npm install
```

### 3. Configurar variables de entorno
Create a local `.env` file (it is ignored by Git):

```env
VITE_API_URL=http://localhost:4000
VITE_AUTH0_CLIENT_ID=tu_client_id
VITE_AUTH0_DOMAIN=dev-xxxx.us.auth0.com
VITE_AUTH0_AUDIENCE=https://tu-api-identifier
```

Vite incorpora las variables `VITE_*` en el bundle del navegador. No coloques
secretos en ellas. `VITE_API_URL` debe apuntar a la URL base del backend, sin
añadir `/api/v1`, porque las llamadas agregan ese prefijo según el módulo.

### 4. Correr en desarrollo
```bash
npm run dev
```
La app inicia en `http://localhost:5173`

---

## 🗺️ Rutas de la aplicación

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | Home | Público |
| `/restaurant/:id` | RestaurantDetail | Público |
| `/cart` | Cart | Público |
| `/checkout` | Checkout | Autenticado |
| `/orders` | MyOrders | Autenticado |
| `/orders/:id` | OrderDetail | Autenticado |
| `/profile` | Profile | Autenticado |
| `/onboarding` | Onboarding | Autenticado |
| `/become-driver` | BecomeDriver | Autenticado |
| `/driver` | DriverDashboard | DELIVERY |
| `/restaurant-dashboard` | RestaurantPortal | RESTAURANT_OWNER |
| `/register-restaurant` | RegisterRestaurant | Autenticado |
| `/admin` | Dashboard | ADMIN |
| `/adminMark` | MarketingDashboard | MARKETING_ADMIN |
| `/adminTec` | TechDashboard | TECH_ADMIN |
| `/adminFin` | FinanceDashboard | FINANCE_ADMIN |
| `/reports` | Reports | Autenticado |
| `/restaurant-orders` | RestaurantDashboard | RESTAURANT_OWNER |
| `/admin/register` | RegisterAdmin | Invitación |
| `/adminMark/register` | RegisterMarketingAdmin | Invitación |
| `/adminTec/register` | RegisterTechAdmin | Invitación |
| `/adminFin/register` | RegisterFinanceAdmin | Invitación |
| `/payment/success` | PaymentResult | Público |
| `/payment/pending` | PaymentResult | Público |
| `/payment/failure` | PaymentResult | Público |
| `/callback` | Callback | — |

---

## ⚡ Scripts

```bash
npm run dev      # Desarrollo con HMR
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Lint con ESLint
```

---

## 🚢 Despliegue en producción (Vercel)

El frontend se despliega como una aplicación Vite en Vercel. El archivo
`vercel.json` contiene el rewrite necesario para que las rutas de React Router
funcionen al recargar directamente una URL.

### Variables de entorno en Vercel

Project Settings → Environment Variables:

```env
VITE_API_URL=https://xxxxxxxxx.onrender.com
VITE_AUTH0_CLIENT_ID=tu_client_id_de_auth0
VITE_AUTH0_DOMAIN=dev-xxxxxxxxx.us.auth0.com
VITE_AUTH0_AUDIENCE=https://xxxxxxxxx
```

Usa estas cuatro variables en los entornos de Preview y Production si ambos
deben consumir el backend de Render. Después de modificar una variable, crea
un nuevo despliegue para que Vite regenere el bundle.

### Configuración de build en Vercel

| Campo | Valor |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` o el detectado por Vercel |
| Node version | `22` |

### Auth0 — URLs permitidas

Dashboard → Applications → tu app → Settings:

```
Allowed Callback URLs:
http://localhost:5173/callback, https://tu-dominio-vercel.vercel.app/callback

Allowed Logout URLs:
http://localhost:5173, https://tu-dominio-vercel.vercel.app

Allowed Web Origins:
http://localhost:5173, https://tu-dominio-vercel.vercel.app
```

> ⚠️ Auth0 requiere HTTPS en producción. Vercel habilita HTTPS automáticamente.

> ⚠️ Si usas login con Google, debes configurar tus propias credenciales OAuth en Google Cloud Console y pegarlas en Auth0 → Authentication → Social → Google. Las Dev Keys de Auth0 no funcionan en producción.

---

## 📄 Licencia

Qoribex — Antojia © 2025
