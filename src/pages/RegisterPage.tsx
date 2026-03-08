import React, { useState } from 'react';
import { Eye, EyeOff, Shield, ArrowLeft, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';

export default function RegisterPage() {
  const { setCurrentView } = useApp();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', crmv: '', specialty: 'Ortopedia Veterinária',
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const passwordStrength = (p: string) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength(form.password);
  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'][strength];
  const strengthColor = ['', '#DC2626', '#D97706', '#059669', '#0056b3'][strength];

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim())     { setError('Informe seu nome completo.'); return; }
    if (!form.email.trim())    { setError('Informe seu e-mail.'); return; }
    if (form.password.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return; }
    if (!acceptTerms) { setError('Aceite os termos de uso para continuar.'); return; }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signUpError) { setError(signUpError.message); return; }

      // Atualizar perfil com dados clínicos
      if (data.user) {
        await supabase.from('users').upsert({
          id:        data.user.id,
          email:     form.email,
          name:      form.name,
          crmv:      form.crmv,
          specialty: form.specialty,
          role:      'veterinarian',
        });
      }

      setSuccess(true);
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)', fontFamily: 'Montserrat, sans-serif' }}>
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="OrtoBolt" className="h-10 w-auto object-contain drop-shadow-lg" />
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: '#ECFDF5' }}>
              <Check size={28} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Conta criada!</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Enviamos um e-mail de confirmação para <strong>{form.email}</strong>.<br />
              Confirme seu e-mail para ativar sua conta.
            </p>
            <button onClick={() => setCurrentView('login')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: '#0056b3', boxShadow: '0 4px 14px rgba(0,86,179,0.3)' }}>
              Ir para o Login
            </button>
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
            Junte-se a mais de<br />
            <span style={{ color: '#38BDF8' }}>180 veterinários</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            Crie sua conta gratuitamente e comece a usar o OrtoBolt hoje mesmo. Sem cartão de crédito.
          </p>
          <div className="space-y-3">
            {[
              '14 dias grátis com todas as funcionalidades',
              'Sem compromisso, cancele quando quiser',
              'Suporte em português incluído',
              'Dados protegidos com LGPD',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-white/80">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(56,189,248,0.2)' }}>
                  <svg viewBox="0 0 12 12" width="10" height="10">
                    <polyline points="2,6 5,9 10,3" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">© 2025 OrtoBolt · LGPD Compliant</p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="lg:hidden mb-6">
          <img src="/logo.png" alt="OrtoBolt" className="h-9 w-auto object-contain" />
        </div>

        <div className="w-full max-w-sm py-4">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Criar conta gratuita</h1>
            <p className="text-sm text-slate-400">
              Já tem conta?{' '}
              <button onClick={() => setCurrentView('login')}
                className="font-semibold" style={{ color: '#0056b3' }}>
                Entrar aqui
              </button>
            </p>
          </div>

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome completo *</label>
              <input type="text" value={form.name} onChange={set('name')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                placeholder="Dr(a). Seu Nome" />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail *</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                placeholder="seu@email.com" />
            </div>

            {/* CRMV + Especialidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">CRMV</label>
                <input type="text" value={form.crmv} onChange={set('crmv')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                  placeholder="SP 12.345" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Especialidade</label>
                <select value={form.specialty} onChange={set('specialty')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all bg-white">
                  <option>Ortopedia Veterinária</option>
                  <option>Cirurgia Geral</option>
                  <option>Clínica Geral</option>
                  <option>Neurologia</option>
                  <option>Outro</option>
                </select>
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                  placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Indicador de força */}
              {form.password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: i <= strength ? strengthColor : '#E2E8F0' }} />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmar senha *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                  placeholder="Repita a senha" />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>

            {/* Termos */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" className="sr-only" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} />
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                  style={{ borderColor: acceptTerms ? '#0056b3' : '#CBD5E1', background: acceptTerms ? '#0056b3' : '#fff' }}>
                  {acceptTerms && <svg viewBox="0 0 10 10" width="8" height="8"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                Concordo com os <span style={{ color: '#0056b3' }} className="font-semibold cursor-pointer">Termos de Uso</span> e a <span style={{ color: '#0056b3' }} className="font-semibold cursor-pointer">Política de Privacidade</span> do OrtoBolt
              </span>
            </label>

            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: '#0056b3', boxShadow: '0 4px 14px rgba(0,86,179,0.3)' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#004494'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0056b3'; }}>
              {loading ? 'Criando conta...' : 'Criar conta gratuita'}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
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

