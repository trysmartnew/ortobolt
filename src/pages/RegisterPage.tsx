import { OrtoBoltLogo } from '../components/brand/OrtoBoltLogo';
// src/pages/RegisterPage.tsx
// ✅ U-03: Senha fraca bloqueia envio — score mínimo 2 obrigatório
// (restante do arquivo mantido igual ao original)

import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';
import { RegisterSchema, type RegisterInput } from '@/schemas/auth';
import { Input } from '@/components/forms/Input';

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
const STRENGTH_COLORS = ['', 'var(--color-error)', 'var(--color-warning)', 'var(--color-primary)', 'var(--color-success)'];

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
  const [crmvState, setCrmvState] = useState('');
  const [crmvDeclaration, setCrmvDeclaration] = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess] = useState(false);
  const [showLoginButton, setShowLoginButton] = useState(false);

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const passwordStrength = calcPasswordStrength(form.password);

  const handleSubmit = async () => {
      setError('');
      setShowLoginButton(false);

      // Validação Zod (campos comuns)
      const validation = RegisterSchema.safeParse({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      if (!validation.success) {
        const firstError = validation.error.issues?.[0]?.message ?? 'Verifique os dados do formulário.';
        setError(firstError);
        return;
      }

      // Validação CRMV
      if (!form.crmv.trim())     { setError('Informe seu CRMV.'); return; }
      if (!/^\d+\/[A-Z]{2}$/.test(form.crmv.trim())) {
        setError('Formato inválido. Use: 12345/SP');
        return;
      }

      if (!form.specialty)       { setError('Selecione sua especialidade.'); return; }

      // Regra de negócio: força da senha
      if (passwordStrength < 2) {
        setError('Senha muito fraca. Use ao menos 8 caracteres, uma letra maiúscula e um número.');
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

      if (signUpErr) {
      if (signUpErr.message.includes('already registered') || signUpErr.message.includes('User already registered')) {
        setError('Não foi possível concluir o cadastro. Caso já possua uma conta, utilize a opção Entrar.');
        setShowLoginButton(true);
      } else {
        console.error('SignUp error:', signUpErr.message);
        setError('Não foi possível concluir o cadastro. Verifique os dados e tente novamente.');
      }
      return;
    }
      if (!data.user) { setError('Erro ao criar conta. Tente novamente.'); return; }

      // 2. Salvar perfil na tabela users
      const { error: profileErr } = await supabase.from('users').upsert({
        id:          data.user.id,
        name:        form.name.trim(),
        email:       form.email.trim(),
        crmv:        form.crmv.trim(),
        specialty:   form.specialty,
        crmv_state:  crmvState,
        crmv_verified: crmvDeclaration,
        role:        'professional',
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
        if (profileErr.message.includes('duplicate key') || profileErr.message.includes('unique constraint') || profileErr.message.includes('users_crmv_unique')) {
          setError('Não foi possível concluir o cadastro com os dados informados. Caso já possua uma conta, utilize a opção Entrar.');
          setShowLoginButton(true);
        } else {
          console.error('Profile upsert error:', profileErr.message);
        }
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
        style={{ background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-gradient) 100%)', fontFamily: 'Montserrat, sans-serif' }}>
        <div className="glass-panel-premium rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-success-bg)' }}>
            <CheckCircle size={32} className="text-success" />
          </div>
          <h2 className="font-bold text-slate-800 text-xl mb-2">Cadastro realizado!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Verifique seu e-mail <strong>{form.email}</strong> para confirmar sua conta antes de acessar a plataforma.
          </p>
          <button onClick={() => setCurrentView('login')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'var(--color-primary)' }}>
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
        style={{ background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-gradient) 100%)' }}>
        <OrtoBoltLogo variant="horizontal" size="small" showSubtitle={false} />
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">
            Comece agora,<br />
            <span style={{ color: 'var(--color-accent)' }}>é gratuito</span>
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
          <OrtoBoltLogo variant="horizontal" size="small" showSubtitle={false} />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Criar conta</h1>
            <p className="text-sm text-slate-400">
              Já tem conta?{' '}
              <button onClick={() => setCurrentView('login')} className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                Entrar aqui
              </button>
            </p>
          </div>

          <div className="space-y-4">
            {/* Tipo de usuário (removido) */}
            <div className="hidden">
              <input type="text" value="professional" readOnly />
            </div>

            {/* Nome */}
              <div>
                <Input
                  type="text"
                  label="Nome completo"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="Dra. Maria Silva"
                />
              </div>

            {/* E-mail */}
            <div>
                <Input
                  type="email"
                  label="E-mail profissional"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="seu@email.com"
                />
            </div>

            {/* CRMV */}
            <div>
              <Input
                type="text"
                label="CRMV"
                value={form.crmv}
                onChange={e => update('crmv', e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="Ex: 12345/SP"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado do CRMV</label>
              <select value={crmvState} onChange={e => setCrmvState(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 transition-all bg-white">
                <option value="">Selecione...</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
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
                  <Input
                    type={showPass ? 'text' : 'password'}
                    label="Senha"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
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
                        style={{ background: i <= passwordStrength ? STRENGTH_COLORS[passwordStrength] : 'var(--color-border)' }} />
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
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    label="Confirmar senha"
                    value={form.confirmPassword}
                    onChange={e => update('confirmPassword', e.target.value)}
                    placeholder="Repita a senha"
                    className="pr-10"
                  />
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
                  style={{ borderColor: form.acceptTerms ? 'var(--color-primary)' : 'var(--color-border)', background: form.acceptTerms ? 'var(--color-primary)' : '#fff' }}>
                  {form.acceptTerms && <svg viewBox="0 0 10 10" width="8" height="8"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                Aceito os <span style={{ color: 'var(--color-primary)' }} className="font-semibold">Termos de Uso</span> e a{' '}
                <span style={{ color: 'var(--color-primary)' }} className="font-semibold">Política de Privacidade</span>
              </span>
            </label>

            {/* ✅ C-04: Consentimento para análise por IA */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" className="sr-only" checked={form.acceptAiConsent} onChange={e => update('acceptAiConsent', e.target.checked)} />
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                  style={{ borderColor: form.acceptAiConsent ? 'var(--color-primary)' : 'var(--color-border)', background: form.acceptAiConsent ? 'var(--color-primary)' : '#fff' }}>
                  {form.acceptAiConsent && <svg viewBox="0 0 10 10" width="8" height="8"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                Aceito o envio de <strong>dados clínicos anonimizados</strong> para análise por IA (LGPD Art. 7º).
                Nomes e identificadores são removidos ou pseudonimizados antes do envio ao provedor de IA.
              </span>
            </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input type="checkbox" className="sr-only" checked={crmvDeclaration} onChange={e => setCrmvDeclaration(e.target.checked)} />
                  <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                    style={{ borderColor: crmvDeclaration ? 'var(--color-primary)' : 'var(--color-border)', background: crmvDeclaration ? 'var(--color-primary)' : '#fff' }}>
                    {crmvDeclaration && <svg viewBox="0 0 10 10" width="8" height="8"><polyline points="1.5,5 4,7.5 8.5,2" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  </div>
                </div>
                <span className="text-xs text-slate-500 leading-relaxed">
                  Declaro que possuo registro ativo no CRMV informado.
                </span>
              </label>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px rgba(0,86,179,0.3)' }}>
              {loading ? 'Criando conta...' : 'Criar minha conta'}
            </button>
            {showLoginButton && (
              <button onClick={() => setCurrentView('login')} className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'var(--color-primary)', boxShadow: '0 4px 14px rgba(0,86,179,0.3)' }}>
                Entrar
              </button>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield size={12} className="text-success" /> SSL/TLS · LGPD
            </div>
            <button onClick={() => setCurrentView('home')}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <ArrowLeft size={11} /> Página inicial
            </button>

            <button
              type="button"
              onClick={async () => {
                if (!form.name.trim() || !form.email.trim() || !form.password) {
                  setError('Preencha nome, e-mail e senha.');
                  return;
                }
                setLoading(true);
                setError('');
    setShowLoginButton(false);
                try {
                  const { data, error } = await supabase.auth.signUp({
                    email: form.email.trim(),
                    password: form.password,
                    options: { data: { name: form.name.trim() } }
                  });
                  if (error) throw error;
                  if (!data.user) throw new Error('Erro ao criar conta.');
                  
                  await supabase.from('users').upsert({
                    id: data.user.id,
                    name: form.name.trim(),
                    email: form.email.trim(),
                    role: 'student',
                    crmv: '',
                    specialty: '',
                    crmv_state: '',
                    crmv_verified: false
                  });
                  
                  setSuccess(true);
                } catch (err: any) {
                  if (err.message?.includes('already registered') || err.message?.includes('User already registered')) {
                    setError('Não foi possível concluir o cadastro. Caso já possua uma conta, utilize a opção Entrar.');
                    setShowLoginButton(true);
                  } else {
                    setError('Não foi possível concluir o cadastro. Tente novamente.');
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full mt-4 py-3 px-4 rounded-lg font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Entrar como Aluno / Ambiente Acadêmico'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

