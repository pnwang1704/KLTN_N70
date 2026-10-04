import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CartProvider } from './context/CartContext.tsx'
import { HeldOrdersProvider } from './context/HeldOrdersContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
      <HeldOrdersProvider>
        <App />
      </HeldOrdersProvider>
    </CartProvider>
  </StrictMode>,
)
