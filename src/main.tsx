import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';      
import App from './App';
import SeedRAG from '@/components/SeedRAG';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
</StrictMode>,
);
