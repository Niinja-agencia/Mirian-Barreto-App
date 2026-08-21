import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from '@/components/ErrorBoundary'
import { instalarGuardaDeChunk } from '@/lib/chunkGuard'

// Precisa vir antes de montar o React: a falha que interessa acontece ao
// baixar o arquivo da rota, ou seja, antes de qualquer componente existir.
instalarGuardaDeChunk()

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
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
