import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/services/supabase';

export default function AcademicDisclaimer() {
  const { user } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'student' && !user.academic_disclaimer_accepted) {
      setShowModal(true);
    }
  }, [user]);

  const handleAccept = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await supabase
        .from('users')
        .update({ academic_disclaimer_accepted: true })
        .eq('id', user.id);
      
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao aceitar disclaimer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Montserrat' }}>
            Ambiente Acadêmico
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Este ambiente possui finalidade educacional e demonstrativa. Qualquer utilização clínica deve ocorrer sob supervisão e responsabilidade de médico-veterinário regularmente inscrito no CRMV.
        </p>

        <div className="pt-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Confirmando...' : 'Entendi e continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}