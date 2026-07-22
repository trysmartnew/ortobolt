import { OrtoBoltLogo } from '../components/brand/OrtoBoltLogo';
import { useState, useEffect } from 'react';
import {
  Activity, Brain, FileText, Users, Shield, Zap,
  ChevronRight, Star, ArrowRight, Check, Menu, X,
  Stethoscope, TrendingUp, Clock, Award
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const FEATURES = [
  {
    icon: Stethoscope,
    title: 'Sessão de Casos',
    desc: 'Registre, organize e acompanhe casos clínicos e cirúrgicos do diagnóstico à alta. Histórico completo com checklists de protocolos e evolução do paciente.',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-light)',
  },
  {
    icon: Brain,
    title: 'OrthoAI Avançado',
    desc: 'Inteligência artificial especializada em medicina veterinária com protocolos ortopédicos e cálculos clínicos precisos.',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-light)',
  },
  {
    icon: Activity,
    title: 'Análise de Imagens',
    desc: 'Upload de radiografias com detecção automática de landmarks anatômicos e score de precisão diagnóstica em segundos.',
    color: 'var(--color-accent)',
    bg: '#ECFEFF',
  },
  {
    icon: FileText,
    title: 'Laudos em PDF',
    desc: 'Geração automática de relatórios clínicos completos com análise de risco, recomendações e protocolo anestésico.',
    color: 'var(--color-success)',
    bg: '#ECFDF5',
  },
  {
    icon: TrendingUp,
    title: 'Painel Clínico de Métricas',
    desc: 'Acompanhe evolução clínica, precisão média e evolução dos seus casos com gráficos interativos.',
    color: 'var(--color-warning)',
    bg: '#FFFBEB',
  },
  {
    icon: Shield,
    title: 'Segurança LGPD',
    desc: 'Dados clínicos protegidos com criptografia AES-256, backups automáticos e total conformidade com a LGPD.',
    color: 'var(--color-error)',
    bg: '#FEF2F2',
  },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Marcus Andrade',
    role: 'Cirurgião Ortopédico · CRMV-SP 18.432',
    text: 'O Vanguard Veterinary centralizou toda a minha gestão de casos. Antes perdia informações em anotações soltas. Hoje acompanho a evolução de cada paciente do diagnóstico à alta em um só lugar.',
    rating: 5,
    avatar: 'MA',
    color: 'var(--color-primary)',
  },
  {
    name: 'Dr. Paulo Henrique',
    role: 'Residente em Cirurgia · CRMV-RJ 5.891',
    text: 'Os checklists de protocolo me dão segurança para não esquecer nenhuma etapa do pós-operatório. O OrthoAI complementa com cálculos de dosagem e diagnósticos diferenciais quando preciso.',
    rating: 5,
    avatar: 'PH',
    color: '#7C3AED',
  },
];

const STATS = [
  { value: '5.000+', label: 'Casos gerenciados', icon: FileText },
  { value: '180+', label: 'Veterinários ativos', icon: Users },
  { value: '100%', label: 'Histórico preservado', icon: Shield },
  { value: '< 60s', label: 'Laudos gerados', icon: Clock },
];

export default function HomePage() {
  const { setCurrentView } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c0d] text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}


          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {['Funcionalidades', 'Depoimentos', 'Planos'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium transition-colors"
                style={{ color: scrolled ? '#334155' : 'rgba(255,255,255,0.85)' }}
                onMouseEnter={e => (e.currentTarget.style.color = scrolled ? 'var(--color-primary)' : '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = scrolled ? '#334155' : 'rgba(255,255,255,0.85)')}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Botão Entrar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('login')}
              className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                background: scrolled ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: scrolled ? 'none' : '1.5px solid rgba(255,255,255,0.5)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = scrolled ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'none'; }}
            >
              Entrar <ChevronRight size={15} />
            </button>
            <button
              onClick={() => setCurrentView('register')}
              className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                background: scrolled ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: scrolled ? 'none' : '1.5px solid rgba(255,255,255,0.5)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = scrolled ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'none'; }}
            >
              Cadastre-se gratuitamente
            </button>

            {/* Mobile menu */}
            <button
              className="md:hidden p-2"
              onClick={() => setMenuOpen(v => !v)}
              style={{ color: scrolled ? '#334155' : '#fff' }}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden glass-panel-premium border-t border-white/10 px-6 py-4 space-y-3">
            {['Funcionalidades', 'Depoimentos', 'Planos'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm font-medium text-white/70 py-1" onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <button
              onClick={() => setCurrentView('login')}
              className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              Entrar na plataforma
            </button>
            <button
              onClick={() => setCurrentView('register')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border"
              style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
            >
              Criar conta gratuita
            </button>
          </div>
        )}
      </header>
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-gradient) 50%, var(--color-navy-mid) 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #3B9EFF, transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #00D4FF, transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-20">
          <div className="flex items-center justify-center mb-6"><OrtoBoltLogo variant="vertical" size="large" /></div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#7DD3FC', border: '1px solid rgba(125,211,252,0.3)' }}>
            <Zap size={12} />
            Gestão clínica completa para ortopedia veterinária
          </div>

          {/* H1 */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Gerencie seus casos clínicos
            <span className="block" style={{ color: 'var(--color-accent)' }}>
              com eficiência e segurança
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Registre, organize e acompanhe casos ortopédicos do diagnóstico
            à alta — com IA integrada para apoio à decisão clínica.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setCurrentView('register')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 shadow-xl"
              style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 8px 32px rgba(0,86,179,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,86,179,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,86,179,0.4)'; }}
            >
              Comece Já — É Gratuito <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setCurrentView('login')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >
              Já tenho conta — Entrar
            </button>
          </div>

          {/* Social proof mini */}
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-white/50">
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" /> Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" /> LGPD Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" /> Suporte em português
            </span>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className="py-16 bg-transparent">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center p-6 rounded-2xl"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Icon size={24} className="mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
                <div className="text-3xl font-extrabold mb-1" style={{ color: 'var(--color-navy)' }}>{value}</div>
                <div className="text-xs font-medium" style={{ color: '#64748B' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-20 premium-header-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              <Stethoscope size={12} /> Funcionalidades
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: 'var(--color-navy)' }}>
              Tudo que você precisa em uma plataforma
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#475569' }}>
              Do diagnóstico ao laudo final — o Vanguard Veterinary acompanha cada etapa do seu trabalho clínico.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="p-6 rounded-2xl glass-panel-premium transition-all duration-200 cursor-default"
                style={{ border: '1px solid #E2E8F0' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#1E293B' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ─────────────────────────────────────────────── */}
      <section id="planos" className="py-20"
        style={{ background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-gradient) 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#7DD3FC' }}>
            <Award size={12} /> Plano gratuito disponível
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Comece hoje, sem compromisso
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Acesse gratuitamente. Cadastre casos, use o OrthoAI e gere laudos em PDF sem limite de tempo.

          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setCurrentView('register')}
              className="px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200"
              style={{ background: 'var(--color-primary)', color: '#fff', boxShadow: '0 8px 32px rgba(0,86,179,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.transform = 'none'; }}
            >
              Criar conta gratuita →
            </button>
            <button
              onClick={() => setCurrentView('login')}
              className="px-8 py-4 rounded-2xl font-semibold text-base transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Já tenho conta
            </button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section id="depoimentos" className="py-20 bg-transparent">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: '#FEF9C3', color: '#92400E' }}>
              <Star size={12} /> Depoimentos
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: 'var(--color-navy)' }}>
              O que dizem nossos veterinários
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, rating, avatar, color }) => (
              <div key={name} className="p-6 rounded-2xl"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array(rating).fill(0).map((_, i) => (
                    <Star key={i} size={14} fill="var(--color-warning)" style={{ color: 'var(--color-warning)' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#475569' }}>"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: color }}>
                    {avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#1E293B' }}>{name}</div>
                    <div className="text-xs" style={{ color: '#64748B' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="py-8 glass-panel-premium border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">          <p className="text-xs" style={{ color: '#64748B' }}>
          © 2025 Vanguard Veterinary · Medicina Veterinária com IA · LGPD Compliant
        </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
            <Shield size={12} className="text-success" />
            SSL/TLS · Dados protegidos
          </div>
        </div>
      </footer>
    </div>
  );
}
