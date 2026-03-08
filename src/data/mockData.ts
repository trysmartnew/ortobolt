import type { User, ClinicalCase, KPIMetric, ChartDataPoint, Notification, Report, Collaborator, CaseMessage } from '@/types/index';

export const MOCK_USER: User = { id:'vet-001', name:'Dra. Fernanda Carvalho', email:'fernanda.carvalho@ortobolt.com.br', role:'veterinarian', specialty:'Ortopedia e Traumatologia Veterinária', crmv:'CRMV-SP 45.821', institution:'Hospital Veterinário UNESP — Botucatu', certifications:[ {id:'c1',title:'Especialização em Ortopedia Veterinária',issuer:'CFMV',year:2019,verified:true}, {id:'c2',title:'Cirurgia Minimamente Invasiva — TPLO Avançado',issuer:'ACVS',year:2021,verified:true}, {id:'c3',title:'Visão Computacional Aplicada — Medicina Veterinária',issuer:'USP',year:2023,verified:true} ], stats:{totalCases:847,successRate:96.4,avgPrecision:94.7,monthlyProcedures:23}, preferences:{notifications:true,theme:'light',language:'pt',autoAnalysis:true,reportFormat:'pdf'} };

export const MOCK_CASES: ClinicalCase[] = [
  {id:'case-001',title:'TPLO Bilateral — Ruptura LCA',patientName:'Thor',species:'canine',breed:'Labrador Retriever',ageYears:4,weightKg:32.5,procedure:'TPLO',status:'completed',precisionScore:97.2,riskLevel:'low',createdAt:'2025-03-01T08:30:00Z',updatedAt:'2025-03-01T14:20:00Z',tags:['TPLO','bilateral','LCA','canino'],imageUrl:'https://picsum.photos/seed/ort1/800/600',veterinarianId:'vet-001',aiAnalysis:{id:'ai-001',timestamp:'2025-03-01T09:00:00Z',precisionScore:97.2,confidence:0.94,processingTimeMs:1240,riskFactors:[{category:'Peso',description:'Peso elevado pode aumentar estresse no implante',severity:'low'}],recommendations:['Fisioterapia pós-operatória por 8 semanas','Controle radiográfico em 6 semanas'],anatomicalLandmarks:[{name:'Plateau tibial',detected:true,confidence:0.97},{name:'Tuberosidade tibial',detected:true,confidence:0.95},{name:'Côndilo femoral lateral',detected:true,confidence:0.93}]},notes:'Procedimento bilateral executado sem intercorrências. Recuperação dentro do esperado.'},
  {id:'case-002',title:'FHO — Displasia Coxofemoral Severa',patientName:'Mimi',species:'feline',breed:'Persa',ageYears:7,weightKg:5.1,procedure:'FHO',status:'completed',precisionScore:95.8,riskLevel:'medium',createdAt:'2025-03-03T10:00:00Z',updatedAt:'2025-03-03T12:45:00Z',tags:['FHO','felino','displasia'],imageUrl:'https://picsum.photos/seed/ort2/800/600',veterinarianId:'vet-001',notes:'Recuperação excelente. Deambulação em 72h.'},
  {id:'case-003',title:'Fixação Interna — Fratura Fêmur Distal',patientName:'Baio',species:'equine',breed:'Quarto de Milha',ageYears:3,weightKg:480,procedure:'fracture_fixation',status:'in_analysis',precisionScore:88.4,riskLevel:'high',createdAt:'2025-03-05T07:15:00Z',updatedAt:'2025-03-05T09:30:00Z',tags:['equino','fratura','fêmur'],imageUrl:'https://picsum.photos/seed/ort3/800/600',veterinarianId:'vet-001'},
  {id:'case-004',title:'TTA — Ruptura Parcial LCA',patientName:'Max',species:'canine',breed:'Rottweiler',ageYears:5,weightKg:45.2,procedure:'TTA',status:'pending',riskLevel:'medium',createdAt:'2025-03-06T14:00:00Z',updatedAt:'2025-03-06T14:00:00Z',tags:['TTA','LCA','canino'],imageUrl:'https://picsum.photos/seed/ort4/800/600',veterinarianId:'vet-001'},
  {id:'case-005',title:'Cirurgia Espinhal — Hérnia Hansen Tipo I',patientName:'Bolinha',species:'canine',breed:'Dachshund',ageYears:6,weightKg:9.8,procedure:'spinal_surgery',status:'critical',riskLevel:'high',createdAt:'2025-03-07T03:00:00Z',updatedAt:'2025-03-07T03:00:00Z',tags:['espinhal','hérnia','urgência'],imageUrl:'https://picsum.photos/seed/ort5/800/600',veterinarianId:'vet-001'},
  {id:'case-006',title:'Substituição Articular — Prótese Total de Quadril',patientName:'Nina',species:'canine',breed:'Golden Retriever',ageYears:9,weightKg:28,procedure:'joint_replacement',status:'in_analysis',precisionScore:91.3,riskLevel:'high',createdAt:'2025-03-07T10:00:00Z',updatedAt:'2025-03-07T10:00:00Z',tags:['prótese','quadril','artrose'],imageUrl:'https://picsum.photos/seed/ort6/800/600',veterinarianId:'vet-001'},
];

// ── Mock Collaborators per case ───────────────────────────────────────────────
export const MOCK_COLLABORATORS: Collaborator[] = [
  { id:'col-001', caseId:'case-001', userId:'vet-002', name:'Dr. Rafael Moreira', email:'rafael.moreira@usp.br', specialty:'Cirurgia Ortopédica Veterinária', crmv:'CRMV-SP 38.210', institution:'FMVZ — USP', role:'consultant', status:'accepted', invitedAt:'2025-03-01T09:00:00Z', acceptedAt:'2025-03-01T09:45:00Z', online:true },
  { id:'col-002', caseId:'case-001', userId:'vet-003', name:'Dra. Ana Lima', email:'ana.lima@puc.br', specialty:'Anestesiologia Veterinária', crmv:'CRMV-RJ 22.441', institution:'PUC-Rio', role:'observer', status:'accepted', invitedAt:'2025-03-01T10:00:00Z', acceptedAt:'2025-03-01T11:30:00Z', online:false },
  { id:'col-003', caseId:'case-003', userId:'vet-004', name:'Dr. Marcos Teixeira', email:'marcos.teixeira@unifesp.br', specialty:'Ortopedia Equina', crmv:'CRMV-SP 51.089', institution:'UNIFESP', role:'consultant', status:'accepted', invitedAt:'2025-03-05T08:00:00Z', acceptedAt:'2025-03-05T08:30:00Z', online:true },
  { id:'col-004', caseId:'case-005', userId:'vet-005', name:'Dra. Paula Santos', email:'paula.santos@ufrgs.br', specialty:'Neurologia Veterinária', crmv:'CRMV-RS 18.771', institution:'UFRGS', role:'consultant', status:'pending', invitedAt:'2025-03-07T03:30:00Z' },
];

// ── Mock Case Messages ────────────────────────────────────────────────────────
export const MOCK_CASE_MESSAGES: CaseMessage[] = [
  { id:'msg-001', caseId:'case-001', userId:'vet-001', userName:'Dra. Fernanda Carvalho', userRole:'owner', content:'Iniciando discussão do caso. Thor, Labrador 4 anos, TPLO bilateral indicado por ruptura completa do LCA. Imagens radiográficas disponíveis para revisão da equipe.', createdAt:'2025-03-01T08:35:00Z', type:'text' },
  { id:'msg-002', caseId:'case-001', userId:'vet-002', userName:'Dr. Rafael Moreira', userRole:'consultant', content:'Fernanda, analisei as imagens. O ângulo de plateau tibial está em 28° — acima do threshold padrão de 23°. TPLO está corretamente indicado. Para o porte do paciente (32.5kg) recomendo placa TPLO 4.5mm com 7 furos.', createdAt:'2025-03-01T09:50:00Z', type:'text' },
  { id:'msg-003', caseId:'case-001', userId:'vet-001', userName:'Dra. Fernanda Carvalho', userRole:'owner', content:'Concordo. Alguma consideração sobre a sequência bilateral? Pensei em operar o membro esquerdo primeiro — é o mais comprometido clinicamente.', createdAt:'2025-03-01T10:05:00Z', type:'text' },
  { id:'msg-004', caseId:'case-001', userId:'vet-002', userName:'Dr. Rafael Moreira', userRole:'consultant', content:'Estratégia correta. Iniciar pelo membro mais afetado. Sugiro também infusão de dexmedetomidina + ketamina no intraoperatório para analgesia multimodal. Dra. Ana, pode confirmar os parâmetros anestésicos?', createdAt:'2025-03-01T10:20:00Z', type:'text' },
  { id:'msg-005', caseId:'case-001', userId:'vet-003', userName:'Dra. Ana Lima', userRole:'observer', content:'Confirmo. Para 32.5kg: Dexmedetomidina 1mcg/kg + Ketamina 0.5mg/kg em BIC. Morfina 0.3mg/kg IM na pré-med. Monitoração com capnografia contínua obrigatória neste porte.', createdAt:'2025-03-01T10:45:00Z', type:'text' },
  { id:'msg-006', caseId:'case-001', userId:'system', userName:'OrthoAI', userRole:'observer', content:'**Sugestão OrthoAI para TPLO Bilateral — Thor (Labrador, 32.5kg)**\n\n**Implante recomendado:** Placa TPLO 4.5mm Synthes, 7 furos\n**Parafusos tibiais:** 4.5mm cortical proximal / 3.5mm distais\n**Osteotomia estimada:** avanço de 20mm\n**Pós-operatório:** Crioterapia 20min 3×/dia nas primeiras 72h. Hidroterapia a partir da 3ª semana. Controle radiográfico em 6 semanas.', createdAt:'2025-03-01T11:01:00Z', type:'ai_suggestion' },
  { id:'msg-007', caseId:'case-003', userId:'vet-001', userName:'Dra. Fernanda Carvalho', userRole:'owner', content:'Caso urgente. Baio chegou com fratura diafisária de fêmur distal. Equino, 480kg. Preciso de opinião em ortopedia equina com urgência.', createdAt:'2025-03-05T07:20:00Z', type:'text' },
  { id:'msg-008', caseId:'case-003', userId:'vet-004', userName:'Dr. Marcos Teixeira', userRole:'consultant', content:'Fernanda, vi as imagens. Fratura cominutiva grau III de fêmur distal. Prognóstico reservado para deambulação. Vamos precisar de DCP 4.5mm + parafusos interfragmentários. Posso estar aí em 2 horas.', createdAt:'2025-03-05T08:35:00Z', type:'text' },
];

export const KPI_METRICS: KPIMetric[] = [
  { id:'k1', label:'Casos Ativos', value:12, trend:8, trendDirection:'up', icon:'Clipboard', color:'#0056b3' },
  { id:'k2', label:'Precisão Média', value:94.7, unit:'%', trend:2.1, trendDirection:'up', icon:'Target', color:'#059669' },
  { id:'k3', label:'Procedimentos / Mês', value:23, trend:5, trendDirection:'up', icon:'Zap', color:'#d97706' },
  { id:'k4', label:'Alertas Críticos', value:2, trend:-40, trendDirection:'down', icon:'CheckCircle', color:'#dc2626' },
];

export const CHART_DATA: ChartDataPoint[] = [
  { label:'Sem 1', precision:91.2, cases:4, success:3 },
  { label:'Sem 2', precision:93.8, cases:6, success:6 },
  { label:'Sem 3', precision:92.1, cases:5, success:4 },
  { label:'Sem 4', precision:95.4, cases:8, success:8 },
  { label:'Sem 5', precision:94.0, cases:5, success:5 },
  { label:'Sem 6', precision:96.8, cases:7, success:7 },
  { label:'Sem 7', precision:94.7, cases:6, success:6 },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id:'n1', type:'alert', title:'Caso Crítico — Bolinha', message:'Hérnia Hansen Tipo I requer atenção imediata. Encaminhamento para cirurgia em até 6h.', timestamp:new Date(Date.now()-1800000).toISOString(), read:false, caseId:'case-005' },
  { id:'n2', type:'success', title:'TPLO concluído — Thor', message:'Precisão: 97.2%. Relatório disponível para download.', timestamp:new Date(Date.now()-86400000).toISOString(), read:false, caseId:'case-001' },
  { id:'n3', type:'info', title:'Dr. Rafael aceitou colaboração', message:'Dr. Rafael Moreira aceitou o convite para o caso TPLO Bilateral — Thor.', timestamp:new Date(Date.now()-90000000).toISOString(), read:true, caseId:'case-001' },
  { id:'n4', type:'warning', title:'Revisão pendente — Baio', message:'Caso de fixação de fratura equina aguarda revisão da equipe de colaboração.', timestamp:new Date(Date.now()-172800000).toISOString(), read:true, caseId:'case-003' },
];

export const MOCK_REPORTS: Report[] = [
  { id:'r1', title:'Relatório Mensal — Março 2025', type:'monthly', generatedAt:'2025-03-07T10:00:00Z', period:'Março 2025', status:'ready', sizeKb:284 },
  { id:'r2', title:'Caso Thor — TPLO Bilateral', type:'case', generatedAt:'2025-03-01T15:00:00Z', period:'01/03/2025', status:'ready', sizeKb:142 },
];

export const PROCEDURE_LABELS: Record<string,string> = { TPLO:'TPLO', FHO:'FHO', TTA:'TTA', LCP_repair:'Reparo LCA', fracture_fixation:'Fixação de Fratura', joint_replacement:'Substituição Articular', spinal_surgery:'Cirurgia Espinhal', other:'Outro' };
export const SPECIES_LABELS: Record<string,string> = { canine:'Canino', feline:'Felino', equine:'Equino', bovine:'Bovino', other:'Outro' };
