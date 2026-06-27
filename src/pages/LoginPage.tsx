import { OrtoBoltLogo } from '../components/brand/OrtoBoltLogo';
// src/pages/LoginPage.tsx
// ✅ C-02: UI de bloqueio por tentativas excessivas (loginLocked / loginLockSecondsLeft)
// ✅ U-01: rememberMe passado para login() e respeitado na sessão

import { useState } from 'react';
import { Eye, EyeOff, Shield, ArrowLeft, Lock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);




export default function LoginPage() {
  const { login, setCurrentView, loginLocked, loginLockSecondsLeft } = useApp();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [forgotMode, setForgotMode]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

    const handleSubmit = async () => {
    if (loginLocked) {
      setError(`Muitas tentativas incorretas. Aguarde ${loginLockSecondsLeft}s para tentar novamente.`);
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Preencha o e-mail e a senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const ok = await login(email, password, rememberMe);
      if (!ok && !loginLocked) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(provider);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}` },
      });
      if (err) setError(`Erro ao entrar com ${provider}: ${err.message}`);
    } catch {
      setError('Erro ao conectar com provedor social.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setError('Informe seu e-mail.'); return; }
    setForgotLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}`,
      });
      if (err) setError(err.message);
      else setForgotSent(true);
    } catch {
      setError('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-gradient) 100%)', fontFamily: 'Montserrat, sans-serif' }}>
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <OrtoBoltLogo variant="vertical" size="large" />
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
                        <button 
              onClick={handleSubmit} 
              disabled={loading || loginLocked}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px rgba(0,86,179,0.3)' }}
            >
              {loading ? 'Entrando...' : loginLocked ? `Bloqueado (${loginLockSecondsLeft}s)` : 'Entrar na plataforma'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield size={12} className="text-emerald-500" /> SSL/TLS · LGPD
            </div>
            <button onClick={() => setCurrentView('home')}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
              <ArrowLeft size={11} /> Página inicial
            </button>
          </div>
        </div>
      </div>
  );
}
}




