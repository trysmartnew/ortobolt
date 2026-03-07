import React, { useState } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui';

export default function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState('fernanda.carvalho@ortobolt.com.br');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 800));
    const ok = login(email, password);
    if (!ok) setError('E-mail ou senha inválidos. Use o acesso de demonstração.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a40] via-[#002d6b] to-[#001a40] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo.png"
            alt="OrtoBolt — Veterinary Orthopedics"
            className="w-56 h-auto object-contain mb-4 drop-shadow-lg"
          />
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-1" style={{ fontFamily: 'Montserrat' }}>Acessar plataforma</h2>
          <p className="text-xs text-slate-400 mb-6 font-mono">Acesso de demonstração pré-configurado</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail institucional</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30 focus:border-[#0056b3] transition-all"
                placeholder="seu@email.com"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30 focus:border-[#0056b3] transition-all"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
            )}

            <Button className="w-full" loading={loading} onClick={handleSubmit}>
              Entrar na plataforma
            </Button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield size={13} className="text-emerald-500 flex-shrink-0" />
              <span>Conexão segura · SSL/TLS · LGPD Compliant</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/30 mt-5 font-mono">
          © 2025 OrtoBolt · Ortopedia Veterinária Inteligente
        </p>
      </div>
    </div>
  );
}
