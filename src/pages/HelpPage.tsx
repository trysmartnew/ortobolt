// src/pages/HelpPage.tsx
import React, { useState } from 'react';
import { BookOpen, Mail, ChevronDown, ChevronUp, FileText, Stethoscope, Monitor, Brain, BarChart3, Settings } from 'lucide-react';
import { Card, Button, SectionHeader, Badge } from '@/components/ui';

const FAQ_ITEMS = [
  {
    q: 'Como criar um novo paciente?',
    a: 'Acesse a página Pacientes e clique em "Novo Paciente". Preencha os dados do tutor e do animal, adicione exames e finalize o cadastro. O paciente ficará disponível na galeria para seleção de procedimento.',
  },
  {
    q: 'Como gerar um laudo?',
    a: 'Na página Relatórios, utilize os cards "Selecionar Caso" para gerar o Laudo Técnico ou a Guia para o Tutor. O sistema inclui automaticamente as métricas de IA, landmarks e fatores de risco calculados.',
  },
  {
    q: 'Como funciona a análise de IA?',
    a: 'Ao carregar exames na Mesa de Luz Digital, o OrthoAI processa as imagens e gera análise com score de precisão, landmarks anatômicos e fatores de risco. O resultado é exibido na barra lateral e pode ser revisado pelo profissional.',
  },
  {
    q: 'Como exportar meus dados?',
    a: 'Acesse Configurações > Meus Dados e clique em "Exportar (.json)". O download incluirá seu perfil, preferências e dados vinculados em formato JSON.',
  },
  {
    q: 'Como acessar o prontuário?',
    a: 'Abra o paciente desejado na galeria e selecione a aba "Prontuário". Lá você encontrará a evolução clínica, marcações e histórico de procedimentos.',
  },
];

const QUICK_DOCS = [
  { icon: FileText, title: 'Ficha Cadastral', description: 'Cadastro completo de pacientes e tutores com upload de exames.' },
  { icon: Stethoscope, title: 'Prontuário', description: 'Evolução clínica, histórico e anotações profissionais.' },
  { icon: Monitor, title: 'Mesa de Luz Digital', description: 'Análise de radiografias com ferramentas de marcação e apoio da IA.' },
  { icon: Brain, title: 'Análise Diagnóstica', description: 'Processamento de imagens, detecção de landmarks e score de precisão.' },
  { icon: BarChart3, title: 'Relatórios', description: 'Laudos técnicos, guias para tutores e relatórios mensais.' },
  { icon: Settings, title: 'Configurações', description: 'Preferências de notificações, idioma, IA e exportação de dados.' },
];

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <SectionHeader title="Central de Ajuda" subtitle="Documentação, guias rápidos e suporte" />

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'Montserrat, sans-serif' }}>Perguntas Frequentes</h3>
        </div>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.q}</span>
                {openIndex === index ? <ChevronUp size={16} className="text-[var(--color-text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />}
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 text-xs text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border)] pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Monitor size={18} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'Montserrat, sans-serif' }}>Documentação Rápida</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QUICK_DOCS.map((doc, index) => (
            <div key={index} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] hover:border-[var(--color-accent)] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <doc.icon size={16} className="text-[var(--color-accent)]" />
                <h4 className="text-xs font-bold text-[var(--color-text-primary)]">{doc.title}</h4>
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{doc.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'Montserrat, sans-serif' }}>Contato e Suporte</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Equipe Vanguard Veterinary</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Suporte especializado em ortopedia veterinária e análise de imagem.</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2 font-mono">suporte@ortobolt.com.br</p>
          </div>
          <Button variant="primary" size="sm" className="flex items-center gap-2">
            <Mail size={14} />
            Abrir Chamado
          </Button>
        </div>
      </Card>

      <p className="text-[10px] text-slate-400 font-mono text-center">
        Vanguard Veterinary v1.0.0 · © 2026 Vanguard Veterinary LTDA · CRMV-SP Certificado
      </p>
    </div>
  );
}
