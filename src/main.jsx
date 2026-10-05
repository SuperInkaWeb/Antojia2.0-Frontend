import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// Cliente de React Query — caché global de todas las llamadas al backend
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        1000 * 60 * 5, // datos frescos por 5 minutos
      retry:            1,             // reintentar 1 vez si falla
      refetchOnWindowFocus: false,     // no recargar al cambiar de pestaña
    },
  },
})

function Auth0ProviderWithNavigate({ children }) {
  const navigate = useNavigate()

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || '/')
  }

  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin + '/callback',
        audience:     import.meta.env.VITE_AUTH0_AUDIENCE,
        scope:        'openid profile email',
        connection:   import.meta.env.VITE_AUTH0_CONNECTION,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Auth0ProviderWithNavigate>
          <App />
          {/* Notificaciones globales */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '10px',
                fontFamily: 'inherit',
              },
              success: {
                iconTheme: { primary: '#16a34a', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#dc2626', secondary: '#fff' },
              },
            }}
          />
        </Auth0ProviderWithNavigate>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
