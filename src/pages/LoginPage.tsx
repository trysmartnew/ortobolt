import React, { useState } from 'react';
import { Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
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

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

export default function LoginPage() {
  const { login, setCurrentView } = useApp();
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
    if (!email.trim() || !password.trim()) { setError('Preencha o e-mail e a senha.'); return; }
    setLoading(true); setError('');
    try {
      const ok = await login(email, password);
      if (!ok) setError('E-mail ou senha incorretos. Verifique suas credenciais.');
    } catch { setError('Erro de conexão. Verifique sua internet e tente novamente.'); }
    finally { setLoading(false); }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setSocialLoading(provider);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (err) setError(`Erro ao entrar com ${provider}: ${err.message}`);
    } catch { setError('Erro ao conectar com provedor social.'); }
    finally { setSocialLoading(null); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setError('Informe seu e-mail.'); return; }
    setForgotLoading(true); setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}`,
      });
      if (err) setError(err.message);
      else setForgotSent(true);
    } catch { setError('Erro ao enviar e-mail. Tente novamente.'); }
    finally { setForgotLoading(false); }
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)', fontFamily: 'Montserrat, sans-serif' }}>
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="OrtoBolt" className="h-10 w-auto object-contain drop-shadow-lg" />
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <button onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-5 transition-colors">
              <ArrowLeft size={13} /> Voltar ao login
            </button>
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
                  <Shield size={24} className="text-emerald-500" />
                </div>
                <h2 className="font-bold text-slate-800 mb-2">E-mail enviado!</h2>
                <p className="text-sm text-slate-500 mb-6">Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
                <button onClick={() => { setForgotMode(false); setForgotSent(false); }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0056b3' }}>
                  Voltar ao login
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-bold text-slate-800 text-lg mb-1">Recuperar senha</h2>
                <p className="text-xs text-slate-400 mb-6">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                      placeholder="seu@email.com" onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />
                  </div>
                  {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
                  <button onClick={handleForgotPassword} disabled={forgotLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#0056b3' }}>
                    {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Painel esquerdo desktop */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)' }}>
        <img src="/logo.png" alt="OrtoBolt" className="h-9 w-auto object-contain" />
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">
            Precisão cirúrgica com<br />
            <span style={{ color: '#38BDF8' }}>inteligência artificial</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            Mais de 180 veterinários confiam no OrtoBolt para análise de imagens, protocolos cirúrgicos e colaboração em tempo real.
          </p>
          <div className="space-y-3">
            {['Análise de radiografias em menos de 60s','Protocolos TPLO, FHO, TTA com IA','Laudos PDF automáticos','Colaboração com especialistas'].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-white/80">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(56,189,248,0.2)' }}>
                  <svg viewBox="0 0 12 12" width="10" height="10"><polyline points="2,6 5,9 10,3" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">© 2025 OrtoBolt · LGPD Compliant</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
        <div className="lg:hidden mb-8">
          <img src="/logo.png" alt="OrtoBolt" className="h-9 w-auto object-contain" />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Entrar na plataforma</h1>
            <p className="text-sm text-slate-400">
              Não tem conta?{' '}
              <button onClick={() => setCurrentView('register')}
                className="font-semibold" style={{ color: '#0056b3' }}>
                Cadastre-se aqui
              </button>
            </p>
          </div>

          {/* Social login */}
          <div className="space-y-2.5 mb-6">
            {[
              { id: 'google',   label: 'Entrar com Google',   Icon: GoogleIcon },
              { id: 'facebook', label: 'Entrar com Facebook', Icon: FacebookIcon },
              { id: 'apple',    label: 'Entrar com Apple',    Icon: AppleIcon },
            ].map(({ id, label, Icon }) => (
              <button key={id}
                onClick={() => handleSocialLogin(id as 'google' | 'facebook' | 'apple')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 hover:bg-slate-50"
                style={{ border: '1.5px solid #E2E8F0', color: '#374151', background: '#fff' }}>
                <Icon />
                {socialLoading === id ? 'Conectando...' : label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">ou entre com e-mail</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                placeholder="seu@email.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600">Senha</label>
                <button onClick={() => setForgotMode(true)} className="text-xs font-medium" style={{ color: '#0056b3' }}>
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                  placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                  style={{ borderColor: rememberMe ? '#0056b3' : '#CBD5E1', background: rememberMe ? '#0056b3' : '#fff' }}>
                  {rememberMe && <svg viewBox="0 0 10 10" width="8" height="8"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
              </div>
              <span className="text-xs text-slate-500">Manter conectado</span>
            </label>

            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: '#0056b3', boxShadow: '0 4px 14px rgba(0,86,179,0.3)' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#004494'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0056b3'; }}>
              {loading ? 'Entrando...' : 'Entrar na plataforma'}
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
    </div>
  );
}

