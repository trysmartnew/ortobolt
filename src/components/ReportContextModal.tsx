import React, { useState } from 'react';

interface ReportContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onGenerate: (context: any) => void;
}

const ReportContextModal: React.FC<ReportContextModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [tutorName, setTutorName] = useState('');
  const [tutorPhone, setTutorPhone] = useState('');
  const [tutorEmail, setTutorEmail] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examType, setExamType] = useState('Radiografia');
  const [equipment, setEquipment] = useState('');
  const [microchip, setMicrochip] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      responsible: { tutorName, tutorPhone, tutorEmail },
      exam_meta: { examDate, examType, equipment },
      patient_extra: { microchip },
    });
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
      <div className='glass-panel-premium w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto'>
        <h2 className='text-xl font-bold text-white mb-2'>Dados Complementares do Laudo Técnico</h2>
        <p className='text-sm text-gray-400 mb-6'>Preencha os dados abaixo para conformidade com as Resoluções CFMV nº 1.321/2020 e nº 1.653/2025.</p>
        <form onSubmit={handleSubmit} className='space-y-5'>
          <div>
            <h3 className='text-lg font-semibold text-teal-400 mb-3'>Responsável pelo Animal</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <input type='text' placeholder='Nome do Responsável *' value={tutorName} onChange={(e) => setTutorName(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400' required />
              <input type='text' placeholder='Telefone/WhatsApp' value={tutorPhone} onChange={(e) => setTutorPhone(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400' />
            </div>
            <input type='email' placeholder='E-mail (opcional)' value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} className='w-full mt-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-teal-400 mb-3'>Meta-dados do Exame</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <input type='date' value={examDate} onChange={(e) => setExamDate(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-teal-400' />
              <input type='text' placeholder='Tipo de Exame' value={examType} onChange={(e) => setExamType(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400' />
            </div>
            <input type='text' placeholder='Equipamento Utilizado (opcional)' value={equipment} onChange={(e) => setEquipment(e.target.value)} className='w-full mt-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-teal-400 mb-3'>Dados Adicionais do Paciente</h3>
            <input type='text' placeholder='Microchip (opcional)' value={microchip} onChange={(e) => setMicrochip(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400' />
          </div>
          <div className='flex justify-end gap-3 pt-4 border-t border-white/10'>
            <button type='button' onClick={onClose} className='px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors'>Cancelar</button>
            <button type='submit' className='px-6 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors'>Gerar Laudo Técnico</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportContextModal;
