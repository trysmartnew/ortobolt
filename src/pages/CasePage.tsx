import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, MessageSquare, Users, Monitor, Send, Bot,
  Building2, Award, Trash2, X, ChevronRight, UserPlus,
  Shield, Eye, AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button, Card, StatusBadge, RiskTag, PrecisionGauge, Modal, Spinner } from '@/components/ui';
import { PROCEDURE_LABELS, SPECIES_LABELS } from '@/data/mockData';
import { getCaseAISuggestion } from '@/services/aiService';
import type { Collaborator, CaseMessage, CollaboratorRole } from '@/types/index';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<CollaboratorRole, string> = { owner:'Proprietário', consultant:'Consultor', observer:'Observador' };
const ROLE_COLORS: Record<CollaboratorRole, string> = { owner:'bg-blue-50 text-blue-700', consultant:'bg-emerald-50 text-emerald-700', observer:'bg-slate-50 text-slate-500' };

function Avatar({ name, online, size='md' }: { name:string; online?:boolean; size?:'sm'|'md' }) {
  const initials = name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const palette = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500','bg-rose-500'];
  const bg = palette[name.charCodeAt(0) % palette.length];
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} ${bg} rounded-full flex items-center justify-center text-white font-bold`}>{initials}</div>
      {online !== undefined && <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-slate-300'}`} />}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, currentUserId, onlineUsers }: { msg:CaseMessage; currentUserId:string; onlineUsers:string[] }) {
  const isMe = msg.userId === currentUserId;
  const isSystem = msg.type === 'system';
  const isAI = msg.type === 'ai_suggestion';

  if (isSystem) return (
    <div className="flex justify-center my-1">
      <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full font-mono"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
    </div>
  );

  if (isAI) return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow">
        <Bot size={16} className="text-white" />
      </div>
      <div className="flex-1 max-w-[88%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-blue-700">OrthoAI</span>
          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-mono">IA</span>
          <span className="text-[10px] text-slate-400 font-mono">{formatTime(msg.createdAt)}</span>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
      </div>
    </div>
  );

  return (
    <div className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
      <Avatar name={msg.userName} online={onlineUsers.includes(msg.userId)} />
      <div className={`flex-1 max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">{msg.userName}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ROLE_COLORS[msg.userRole]}`}>{ROLE_LABELS[msg.userRole]}</span>
            <span className="text-[10px] text-slate-400 font-mono">{formatTime(msg.createdAt)}</span>
          </div>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-[#0056b3] text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
        {isMe && <span className="text-[10px] text-slate-400 font-mono">{formatTime(msg.createdAt)}</span>}
      </div>
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ caseId }: { caseId:string }) {
  const { getCaseMessages, addCaseMessage, user, activeCase, getCaseCollaborators, onlineUsers, addToast } = useApp();
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgs = getCaseMessages(caseId);
  const collabs = getCaseCollaborators(caseId).filter(c => c.status === 'accepted');
  const onlineCount = collabs.filter(c => onlineUsers.includes(c.userId)).length + 1;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = () => {
    const t = input.trim(); if (!t) return;
    addCaseMessage(caseId, t, 'text'); setInput('');
  };

  const askAI = async () => {
  if (!activeCase || aiLoading) return;
  setAiLoading(true);
  try {
    const r = await getCaseAISuggestion(activeCase);
    addCaseMessage(caseId, r, 'ai_suggestion');
    addToast('Sugestão OrthoAI gerada com sucesso.', 'success');
  } catch {
    addToast('Erro ao obter sugestão da IA. Tente novamente.', 'error');
  } finally {
    setAiLoading(false);
  }
};

  return (
    <div data-tour="tour-collab-chat" className="flex flex-col h-full">
      {/* Online bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-emerald-600">{onlineCount} online</span>
        <div className="flex -space-x-2">
          <Avatar name={Users?.name || 'Você'} online size="sm" />
          {collabs.map(c => <Avatar key={c.id} name={c.name} online={onlineUsers.includes(c.userId)} size="sm" />)}
        </div>
        <span className="text-xs text-slate-400 ml-auto font-mono">Chat clínico do caso</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
        {msgs.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Inicie a discussão clínica do caso.</p>
          </div>
        )}
        {msgs.map(m => <MessageBubble key={m.id} msg={m} currentUserId={user?.id || ''} onlineUsers={onlineUsers} />)}
        {aiLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3"><Spinner size="sm" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <button onClick={askAI} disabled={aiLoading} title="Sugestão OrthoAI"
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm">
            <Bot size={15} className="text-white" />
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Discuta o caso com a equipe... (Enter para enviar)"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30 focus:border-[#0056b3]" />
          <button onClick={send} disabled={!input.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0056b3] flex items-center justify-center hover:bg-[#004494] transition-colors disabled:opacity-40 shadow-sm">
            <Send size={15} className="text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-300 font-mono">⚡ Botão azul-violeta = sugestão OrthoAI · Enter = enviar</p>
      </div>
    </div>
  );
} 


// ── Specialists Tab ───────────────────────────────────────────────────────────
function SpecialistsTab({ caseId }: { caseId:string }) {
  const { getCaseCollaborators, inviteCollaborator, removeCollaborator, user, onlineUsers, addToast } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', specialty:'', crmv:'', institution:'', role:'consultant' as 'consultant'|'observer' });
  const collabs = getCaseCollaborators(caseId);

  const ownerCard: Collaborator = {
    id:'owner', caseId, userId:user?.id||'vet-001', name:user?.name||'Você',
    email:user?.email||'', specialty:user?.specialty||'', crmv:user?.crmv||'',
    institution:user?.institution||'', role:'owner', status:'accepted', invitedAt:'', online:true,
  };

  const handleInvite = () => {
  if (!form.name.trim() || !form.email.trim() || !form.specialty.trim() || !form.institution.trim()) {
    addToast('Preencha todos os campos obrigatórios.', 'warning');
    return;
  }
  inviteCollaborator(caseId, form);
  setForm({ name:'', email:'', specialty:'', crmv:'', institution:'', role:'consultant' });
  setShowInvite(false);
  addToast(`Convite enviado para ${form.name}.`, 'success');
  };

  const STATUS_CLS: Record<string,string> = { accepted:'text-emerald-600', pending:'text-amber-500', declined:'text-red-500' };
  const STATUS_LBL: Record<string,string> = { accepted:'Ativo', pending:'Pendente', declined:'Recusado' };

  return (
    <div data-tour="tour-collab-specialists" className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Equipe do Caso</p>
          <p className="text-xs text-slate-500">{collabs.filter(c=>c.status==='accepted').length + 1} participantes · {collabs.filter(c=>c.status==='pending').length} convites pendentes</p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)}><UserPlus size={14} /> Convidar</Button>
      </div>

      {[ownerCard, ...collabs].map(c => (
        <div key={c.id} className="bg-white border border-slate-100 rounded-xl p-3.5 flex items-start gap-3 shadow-sm">
          <Avatar name={c.name} online={c.id === 'owner' ? true : onlineUsers.includes(c.userId)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm font-semibold text-slate-900 truncate">{c.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ROLE_COLORS[c.role]}`}>{ROLE_LABELS[c.role]}</span>
              {c.id !== 'owner' && <span className={`text-[10px] font-semibold ${STATUS_CLS[c.status]}`}>{STATUS_LBL[c.status]}</span>}
            </div>
            <p className="text-xs text-slate-500 truncate">{c.specialty}</p>
            <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1"><Building2 size={9} />{c.institution}</span>
              <span className="flex items-center gap-1"><Award size={9} />{c.crmv}</span>
            </div>
          </div>
          {c.id !== 'owner' && (
            <button onClick={() => removeCollaborator(c.id)} className="text-slate-200 hover:text-red-400 transition-colors flex-shrink-0">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      {collabs.length === 0 && (
        <div className="text-center py-8">
          <Users size={36} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum especialista convidado.</p>
        </div>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Convidar Especialista">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            O especialista terá acesso às imagens, histórico e chat deste caso.
          </div>
          {[{label:'Nome completo *',key:'name',ph:'Dr. João Silva'},{label:'E-mail institucional *',key:'email',ph:'joao@hospital.com'},{label:'Especialidade *',key:'specialty',ph:'Ortopedia Veterinária'},{label:'CRMV',key:'crmv',ph:'CRMV-SP 00.000'},{label:'Instituição *',key:'institution',ph:'Hospital Veterinário XYZ'}].map(({label,key,ph}) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
              <input value={(form as any)[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} placeholder={ph}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Permissão</label>
            <select value={form.role} onChange={e => setForm(f => ({...f,role:e.target.value as any}))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30">
              <option value="consultant">Consultor — pode comentar e sugerir</option>
              <option value="observer">Observador — somente leitura</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleInvite} disabled={!form.name.trim() || !form.email.trim() || !form.specialty.trim() || !form.institution.trim()}>Enviar Convite</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setShowInvite(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Shared Viewer Tab ─────────────────────────────────────────────────────────
function SharedViewerTab({ caseId }: { caseId:string }) {
  const { activeCase, getCaseCollaborators, onlineUsers } = useApp();
  const [zoom, setZoom] = useState(100);
  const collabs = getCaseCollaborators(caseId).filter(c => c.status === 'accepted' && onlineUsers.includes(c.userId));

  if (!activeCase?.imageUrl) return (
    <div data-tour="tour-collab-viewer" className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
      <Eye size={48} className="text-slate-200" />
      <p className="text-sm text-slate-400 font-semibold">Nenhuma imagem disponível</p>
      <p className="text-xs text-slate-300">Adicione imagens ao caso para usar a visualização compartilhada.</p>
    </div>
  );

  return (
    <div data-tour="tour-collab-viewer" className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Visualização Compartilhada</span>
          {collabs.length > 0 && (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-600 font-semibold">{collabs.length + 1} assistindo</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(50,z-25))} className="w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold">−</button>
          <span className="text-xs font-mono text-slate-500 w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200,z+25))} className="w-7 h-7 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-bold">+</button>
          <button onClick={() => setZoom(100)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200 bg-white">100%</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-900 flex items-center justify-center p-6 relative">
        <img src={activeCase.imageUrl} alt={activeCase.patientName}
          style={{ width:`${zoom}%`, maxWidth:'100%', transition:'width .2s' }}
          className="rounded-xl shadow-2xl object-contain" />
        {/* Simulated presence cursors */}
        {collabs.slice(0,2).map((c,i) => (
          <div key={c.id} className="absolute pointer-events-none" style={{ top:`${30+i*20}%`, left:`${35+i*18}%` }}>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor:['#10b981','#f59e0b'][i] }} />
              <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">{c.name.split(' ')[0]}</span>
            </div>
          </div>
        ))}
      </div>

      {collabs.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-2">
          <Eye size={12} className="text-slate-400" />
          <span className="text-xs text-slate-500">Também visualizando:</span>
          {collabs.map(c => <span key={c.id} className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{c.name.split(' ')[0]}</span>)}
        </div>
      )}
    </div>
  );
}

// ── Case Info Bar ─────────────────────────────────────────────────────────────
function CaseInfoBar() {
  const { activeCase } = useApp();
  if (!activeCase) return null;
  const c = activeCase;
  return (
    <div className="px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-4">
        {c.imageUrl && <img src={c.imageUrl} alt={c.patientName} className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-sm font-bold text-slate-900 truncate">{c.title}</h2>
            <StatusBadge status={c.status} /><RiskTag level={c.riskLevel} />
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-slate-500 font-mono">
            <span>{c.patientName}</span><span>·</span><span>{SPECIES_LABELS[c.species]}</span><span>·</span>
            <span>{c.breed}</span><span>·</span><span>{c.ageYears}a {c.weightKg}kg</span><span>·</span>
            <span className="font-semibold text-[#0056b3]">{PROCEDURE_LABELS[c.procedure]}</span>
          </div>
        </div>
        {c.precisionScore && (
          <div className="flex flex-col items-center flex-shrink-0">
            <PrecisionGauge value={c.precisionScore} size={52} />
            <span className="text-[9px] text-slate-400 mt-0.5">Precisão IA</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = 'chat'|'specialists'|'viewer';
const TABS: { id:Tab; label:string; icon:React.ElementType }[] = [
  { id:'chat',        label:'Chat do Caso',          icon:MessageSquare },
  { id:'specialists', label:'Especialistas',          icon:Users         },
  { id:'viewer',      label:'Visualização Conjunta',  icon:Monitor       },
];

export default function CasePage() {
  const { activeCase, closeCase, getCaseCollaborators } = useApp();
  const [tab, setTab] = useState<Tab>('chat');

  if (!activeCase) return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <p className="text-slate-400 mb-4">Nenhum caso selecionado.</p>
      <Button variant="ghost" onClick={closeCase}><ArrowLeft size={14} /> Voltar à Galeria</Button>
    </div>
  );

  const collabs = getCaseCollaborators(activeCase.id);
  const colBadge = collabs.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-slate-100 flex-shrink-0">
        <button onClick={closeCase} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={13} /> Galeria de Casos
        </button>
        <ChevronRight size={11} className="text-slate-300" />
        <span className="text-xs font-semibold text-slate-700 truncate">{activeCase.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">
            <Shield size={10} /> Colaboração ativa
          </div>
          {activeCase.status === 'critical' && (
            <div className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full animate-pulse">
              <AlertTriangle size={10} /> CRÍTICO
            </div>
          )}
        </div>
      </div>

      {/* Case info */}
      <CaseInfoBar />

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white px-4 flex-shrink-0">
        {TABS.map(({ id, label, icon:Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab===id ? 'border-[#0056b3] text-[#0056b3]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14} />
            {label}
            {id === 'specialists' && colBadge > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{colBadge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'chat'        && <ChatTab caseId={activeCase.id} />}
        {tab === 'specialists' && <SpecialistsTab caseId={activeCase.id} />}
        {tab === 'viewer'      && <SharedViewerTab caseId={activeCase.id} />}
      </div>
    </div>
  );
}
