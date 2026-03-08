import React, { useState, useEffect } from 'react';
import {
  Activity, Brain, FileText, Users, Shield, Zap,
  ChevronRight, Star, ArrowRight, Check, Menu, X,
  Stethoscope, TrendingUp, Clock, Award
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const FEATURES = [
  {
    icon: Brain,
    title: 'OrthoAI Avançado',
    desc: 'Inteligência artificial especializada em ortopedia veterinária com protocolos TPLO, FHO, TTA e cálculos biomecânicos precisos.',
    color: '#0056b3',
    bg: '#EFF6FF',
  },
  {
    icon: Activity,
    title: 'Análise de Imagens',
    desc: 'Upload de radiografias com detecção automática de landmarks anatômicos e score de precisão cirúrgica em segundos.',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    icon: FileText,
    title: 'Laudos em PDF',
    desc: 'Geração automática de relatórios clínicos completos com análise de risco, recomendações e protocolo anestésico.',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    icon: Users,
    title: 'Colaboração em Tempo Real',
    desc: 'Convide especialistas, compartilhe casos clínicos e discuta diagnósticos com sua equipe na mesma plataforma.',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: Shield,
    title: 'Segurança LGPD',
    desc: 'Dados clínicos protegidos com criptografia AES-256, backups automáticos e total conformidade com a LGPD.',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    icon: TrendingUp,
    title: 'Dashboard de Métricas',
    desc: 'Acompanhe taxa de sucesso cirúrgico, precisão média e evolução dos seus casos com gráficos interativos.',
    color: '#D97706',
    bg: '#FFFBEB',
  },
];

const TESTIMONIALS = [
  {
    name: 'Dr. Marcus Andrade',
    role: 'Cirurgião Ortopédico · CRMV-SP 18.432',
    text: 'O OrtoBolt transformou minha rotina cirúrgica. A análise de imagens com IA detecta landmarks que antes levavam 20 minutos manualmente. Hoje faço em menos de 1 minuto.',
    rating: 5,
    avatar: 'MA',
    color: '#0056b3',
  },
  {
    name: 'Dra. Carolina Menezes',
    role: 'Ortopedista Veterinária · CRMV-MG 8.104',
    text: 'A função de colaboração em tempo real é incrível. Consigo discutir casos complexos com especialistas de outros estados sem sair da plataforma. Elevou o nível do meu atendimento.',
    rating: 5,
    avatar: 'CM',
    color: '#059669',
  },
  {
    name: 'Dr. Paulo Henrique',
    role: 'Residente em Cirurgia · CRMV-RJ 5.891',
    text: 'Como residente, o OrthoAI é meu segundo cérebro. Os protocolos cirúrgicos e cálculos de dosagem me dão segurança nas decisões. Recomendo para qualquer profissional.',
    rating: 5,
    avatar: 'PH',
    color: '#7C3AED',
  },
];

const STATS = [
  { value: '2.400+', label: 'Casos analisados', icon: FileText },
  { value: '94%', label: 'Taxa de precisão IA', icon: Activity },
  { value: '180+', label: 'Veterinários ativos', icon: Users },
  { value: '< 60s', label: 'Tempo de análise', icon: Clock },
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
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="OrtoBolt" className="h-8 w-auto object-contain" />
          </div>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {['Funcionalidades', 'Depoimentos', 'Planos'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium transition-colors"
                style={{ color: scrolled ? '#334155' : 'rgba(255,255,255,0.85)' }}
                onMouseEnter={e => (e.currentTarget.style.color = scrolled ? '#0056b3' : '#fff')}
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
                background: scrolled ? '#0056b3' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: scrolled ? 'none' : '1.5px solid rgba(255,255,255,0.5)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#004494'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = scrolled ? '#0056b3' : 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'none'; }}
            >
              Entrar <ChevronRight size={15} />
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
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3">
            {['Funcionalidades', 'Depoimentos', 'Planos'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm font-medium text-slate-700 py-1" onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <button
              onClick={() => setCurrentView('login')}
              className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#0056b3' }}
            >
              Entrar na plataforma
            </button>
            <button
              onClick={() => setCurrentView('register')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border"
              style={{ color: '#0056b3', borderColor: '#0056b3' }}
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
          background: 'linear-gradient(135deg, #001a40 0%, #002d6b 50%, #003d8f 100%)',
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
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#7DD3FC', border: '1px solid rgba(125,211,252,0.3)' }}>
            <Zap size={12} />
            Plataforma com IA especializada em ortopedia veterinária
          </div>

          {/* H1 */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Cirurgia veterinária mais
            <span className="block" style={{ color: '#38BDF8' }}>
              precisa, rápida e segura
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            O OrtoBolt une inteligência artificial, análise de imagens e colaboração em tempo real
            para elevar o padrão da ortopedia veterinária no Brasil.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setCurrentView('register')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 shadow-xl"
              style={{ background: '#0056b3', color: '#fff', boxShadow: '0 8px 32px rgba(0,86,179,0.4)' }}
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
            <path d="M0 80L1440 80L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 80Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center p-6 rounded-2xl"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <Icon size={24} className="mx-auto mb-3" style={{ color: '#0056b3' }} />
                <div className="text-3xl font-extrabold mb-1" style={{ color: '#001a40' }}>{value}</div>
                <div className="text-xs font-medium" style={{ color: '#64748B' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: '#EFF6FF', color: '#0056b3' }}>
              <Stethoscope size={12} /> Funcionalidades
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: '#001a40' }}>
              Tudo que você precisa em uma plataforma
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#64748B' }}>
              Do diagnóstico ao laudo final — o OrtoBolt acompanha cada etapa do seu trabalho clínico.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="p-6 rounded-2xl bg-white transition-all duration-200 cursor-default"
                style={{ border: '1px solid #E2E8F0' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#1E293B' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section id="depoimentos" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: '#FEF9C3', color: '#92400E' }}>
              <Star size={12} /> Depoimentos
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: '#001a40' }}>
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
                    <Star key={i} size={14} fill="#F59E0B" style={{ color: '#F59E0B' }} />
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
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ─────────────────────────────────────────────── */}
      <section id="planos" className="py-20"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#7DD3FC' }}>
            <Award size={12} /> Plano gratuito disponível
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Comece hoje, sem compromisso
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Crie sua conta gratuitamente e experimente todas as funcionalidades por 14 dias.
            Sem cartão de crédito, sem pegadinhas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setCurrentView('register')}
              className="px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200"
              style={{ background: '#0056b3', color: '#fff', boxShadow: '0 8px 32px rgba(0,86,179,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#004494'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#0056b3'; e.currentTarget.style.transform = 'none'; }}
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

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo.png" alt="OrtoBolt" className="h-7 w-auto object-contain opacity-60" />
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            © 2025 OrtoBolt · Ortopedia Veterinária Inteligente · LGPD Compliant
          </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#94A3B8' }}>
            <Shield size={12} className="text-emerald-500" />
            SSL/TLS · Dados protegidos
          </div>
        </div>
      </footer>
    </div>
  );
}

