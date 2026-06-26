import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// Captura o evento de instalação cedo (pode disparar antes do React montar).
declare global {
  interface Window {
    __deferredInstallPrompt?: Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
  }
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e as Window['__deferredInstallPrompt'];
  window.dispatchEvent(new Event('mb-install-available'));
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
