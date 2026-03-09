// src/pages/RegisterPage.tsx
// ✅ U-03: Senha fraca bloqueia envio — score mínimo 2 obrigatório
// (restante do arquivo mantido igual ao original)

import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';

// ── Cálculo de força da senha ─────────────────────────────────────────────────
function calcPasswordStrength(pwd: string): number {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#3b82f6', '#22c55e'];

interface FormData {
  name: string;
  email: string;
  crmv: string;
  specialty: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptAiConsent: boolean; // ✅ C-04: consentimento IA
}

const SPECIALTIES = [
  'Ortopedia e Traumatologia Veterinária',
  'Cirurgia de Pequenos Animais',
  'Cirurgia de Grandes Animais',
  'Anestesiologia Veterinária',
  'Neurologia Veterinária',
  'Radiologia Veterinária',
  'Clínica Geral',
  'Residente',
  'Outra',
];

export default function RegisterPage() {
  const { setCurrentView } = useApp();
  const [form, setForm] = useState<FormData>({
    name: '', email: '', crmv: '', specialty: '', password: '', confirmPassword: '',
    acceptTerms: false, acceptAiConsent: false,
  });
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const passwordStrength = calcPasswordStrength(form.password);

  const handleSubmit = async () => {
    setError('');

    // Validações básicas
    if (!form.name.trim())     { setError('Informe seu nome completo.'); return; }
    if (!form.email.trim())    { setError('Informe seu e-mail.'); return; }
    if (!form.crmv.trim())     { setError('Informe seu CRMV.'); return; }
    if (!form.specialty)       { setError('Selecione sua especialidade.'); return; }
    if (!form.password)        { setError('Crie uma senha.'); return; }

    // ✅ U-03: Bloquear senha fraca (score mínimo 2)
    if (passwordStrength < 2) {
      setError('Senha muito fraca. Use ao menos 8 caracteres, uma letra maiúscula e um número.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!form.acceptTerms) {
      setError('Aceite os Termos de Uso para continuar.');
      return;
    }

    setLoading(true);
    try {
      // 1. Criar usuário no Supabase Auth
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { name: form.name.trim() },
        },
      });

      if (signUpErr) { setError(signUpErr.message); return; }
      if (!data.user) { setError('Erro ao criar conta. Tente novamente.'); return; }

      // 2. Salvar perfil na tabela users
      const { error: profileErr } = await supabase.from('users').upsert({
        id:          data.user.id,
        name:        form.name.trim(),
        email:       form.email.trim(),
        crmv:        form.crmv.trim(),
        specialty:   form.specialty,
        role:        'veterinarian',
        institution: '',
        preferences: {
          notifications: true,
          theme: 'light',
          language: 'pt',
          autoAnalysis: form.acceptAiConsent, // ✅ C-04: gravar consentimento IA
          reportFormat: 'pdf',
        },
      });

      if (profileErr) {
        console.error('Profile upsert error:', profileErr.message);
        // Não impede o cadastro — o trigger do Supabase geralmente já cria o perfil
      }

      setSuccess(true);
    } catch (err) {
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)', fontFamily: 'Montserrat, sans-serif' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="font-bold text-slate-800 text-xl mb-2">Cadastro realizado!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Verifique seu e-mail <strong>{form.email}</strong> para confirmar sua conta antes de acessar a plataforma.
          </p>
          <button onClick={() => setCurrentView('login')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#0056b3' }}>
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Painel esquerdo */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)' }}>
        <img src="/logo.png" alt="OrtoBolt" className="h-9 w-auto object-contain" />
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">
            Comece agora,<br />
            <span style={{ color: '#38BDF8' }}>é gratuito</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            Crie sua conta e tenha acesso completo às ferramentas de ortopedia veterinária com IA.
          </p>
        </div>
        <p className="text-white/30 text-xs">© 2025 OrtoBolt · LGPD Compliant</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="lg:hidden mb-6">
          <img src="/logo.png" alt="OrtoBolt" className="h-9 w-auto object-contain" />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Criar conta</h1>
            <p className="text-sm text-slate-400">
              Já tem conta?{' '}
              <button onClick={() => setCurrentView('login')} className="font-semibold" style={{ color: '#0056b3' }}>
                Entrar aqui
              </button>
            </p>
          </div>

          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome completo</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                placeholder="Dra. Maria Silva" />
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail profissional</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                placeholder="seu@email.com" />
            </div>

            {/* CRMV */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">CRMV</label>
              <input type="text" value={form.crmv} onChange={e => update('crmv', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                placeholder="CRMV-SP 00.000" />
            </div>

            {/* Especialidade */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Especialidade</label>
              <select value={form.specialty} onChange={e => update('specialty', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all bg-white">
                <option value="">Selecione...</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => update('password', e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                  placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* ✅ U-03: Indicador de força */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: i <= passwordStrength ? STRENGTH_COLORS[passwordStrength] : '#E2E8F0' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: STRENGTH_COLORS[passwordStrength] }}>
                    {STRENGTH_LABELS[passwordStrength]}
                    {passwordStrength < 2 && ' — adicione maiúsculas e números'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmar senha</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all"
                  placeholder="Repita a senha" />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Termos */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" className="sr-only" checked={form.acceptTerms} onChange={e => update('acceptTerms', e.target.checked)} />
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{ borderColor: form.acceptTerms ? '#0056b3' : '#CBD5E1', background: form.acceptTerms ? '#0056b3' : '#fff' }}>
                  {form.acceptTerms && <svg viewBox="0 0 10 10" width="8" height="8"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                Aceito os <span style={{ color: '#0056b3' }} className="font-semibold">Termos de Uso</span> e a{' '}
                <span style={{ color: '#0056b3' }} className="font-semibold">Política de Privacidade</span>
              </span>
            </label>

            {/* ✅ C-04: Consentimento para análise por IA */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" className="sr-only" checked={form.acceptAiConsent} onChange={e => update('acceptAiConsent', e.target.checked)} />
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{ borderColor: form.acceptAiConsent ? '#0056b3' : '#CBD5E1', background: form.acceptAiConsent ? '#0056b3' : '#fff' }}>
                  {form.acceptAiConsent && <svg viewBox="0 0 10 10" width="8" height="8"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                Aceito o envio de <strong>dados clínicos anonimizados</strong> para análise por IA (LGPD Art. 7º).
                Nenhum dado identificável é transmitido.
              </span>
            </label>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: '#0056b3', boxShadow: '0 4px 14px rgba(0,86,179,0.3)' }}>
              {loading ? 'Criando conta...' : 'Criar minha conta'}
            </button>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield size={12} className="text-emerald-500" /> SSL/TLS · LGPD
            </div>
            <button onClick={() => setCurrentView('home')}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <ArrowLeft size={11} /> Página inicial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
