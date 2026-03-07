import React, { useState } from 'react';
import { Activity, Eye, EyeOff, Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-[#001a40] via-[#003070] to-[#0056b3] flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#0056b3] px-8 py-8 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 120%, white 0%, transparent 60%)' }} />
            <div className="relative">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'Montserrat' }}>OrtoBolt</h1>
              <p className="text-blue-200 text-sm mt-1 font-mono">Ortopedia Veterinária Inteligente</p>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-7 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Acesso ao Sistema</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail Profissional</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vet@hospital.com.br"
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent font-mono" />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
              {error && <p className="text-xs text-red-500 mt-2 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
            <Button className="w-full" size="lg" loading={loading} onClick={handleSubmit}>Entrar no Sistema</Button>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-3.5 w-3.5 text-[#0056b3]" />
                <p className="text-xs font-semibold text-[#0056b3]">Acesso de Demonstração</p>
              </div>
              <p className="text-xs text-slate-500 font-mono">Email: fernanda.carvalho@ortobolt.com.br</p>
              <p className="text-xs text-slate-500 font-mono">Senha: demo1234</p>
            </div>
          </div>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6 font-mono">
          © 2025 OrtoBolt · CRMV-SP Certificado · HL7 FHIR Compliant
        </p>
      </div>
    </div>
  );
}
