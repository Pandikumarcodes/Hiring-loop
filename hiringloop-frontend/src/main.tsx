import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { assertFrontendConfig } from './config/env'
import App from './App.tsx'

assertFrontendConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
