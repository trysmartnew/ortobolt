import { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { useApp } from '@/contexts/AppContext';

export default function ResetPasswordPage() {
  const { setCurrentView, addToast } = useApp();
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [validToken, setValidToken]   = useState(false);
  const [checking, setChecking]       = useState(true);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('ortobolt_recovery_token');
    if (!raw) { setChecking(false); return; }

    const { access_token, refresh_token } = JSON.parse(raw);

    supabase.auth.setSession({ access_token, refresh_token })
      .then(({ error: err }) => {
        if (err) {
          setError('Link inválido ou expirado. Solicite uma nova redefinição.');
        } else {
          setValidToken(true);
          sessionStorage.removeItem('ortobolt_recovery_token');
        }
      })
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async () => {
    if (!password.trim()) { setError('Informe a nova senha.'); return; }
    if (password.length < 8) { setError('Mínimo de 8 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      console.error('UpdateUser error:', err.message);
      setError('Não foi possível redefinir a senha. O link pode estar expirado. Solicite uma nova recuperação.');
      addToast('Erro ao atualizar senha.', 'error');
    } else {
      await supabase.auth.signOut();
      setDone(true);
      addToast('Senha redefinida com sucesso!', 'success');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)' }}>
        <Loader2 size={32} className="text-white animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-50">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="font-bold text-slate-800 text-xl mb-2">Senha redefinida!</h2>
          <p className="text-sm text-slate-500 mb-6">Faça login com sua nova senha.</p>
          <button onClick={() => setCurrentView('login')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-primary">
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
            <Shield size={24} className="text-red-500" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg mb-2">Link inválido ou expirado</h2>
          <p className="text-sm text-slate-500 mb-6">Solicite um novo link de recuperação de senha.</p>
          <button onClick={() => setCurrentView('login')}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-primary">
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #001a40 0%, #002d6b 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="OrtoBolt" className="h-40 w-auto object-contain drop-shadow-lg" />
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="font-bold text-slate-800 text-lg mb-1">Redefinir senha</h2>
          <p className="text-xs text-slate-400 mb-6">Crie uma nova senha segura para sua conta.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nova senha</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="Mínimo 8 caracteres"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmar senha</label>
              <input type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="Repita a senha"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 transition-all">
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
