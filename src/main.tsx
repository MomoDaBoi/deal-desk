import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { playSound } from './lib/sounds'

// Every button press gets a blip (no-op while sound is off). Delegated so
// widgets do not each need to remember it.
document.addEventListener('pointerdown', (e) => {
  const t = e.target as HTMLElement | null
  if (t?.closest('button:not(:disabled)')) playSound('tap')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
