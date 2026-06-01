import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Detectar token de recuperação ANTES do React montar
// O Supabase entrega: https://ortobolt.vercel.app/#access_token=...&type=recovery
const hash = new URLSearchParams(window.location.hash.substring(1));
const tokenType = hash.get('type');
const accessToken = hash.get('access_token');
const refreshToken = hash.get('refresh_token');

if (tokenType === 'recovery' && accessToken) {
  sessionStorage.setItem('ortobolt_recovery_token', JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  }));
  // Limpar hash da URL sem recarregar
  window.history.replaceState(null, '', window.location.pathname);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
