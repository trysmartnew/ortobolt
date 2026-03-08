import type { ClinicalCase } from '@/types/index';

// ── OpenRouter Gateway ─────────────────────────────────────────────────────────
// Migration from Gemini 2.0 Flash to OpenRouter/Mistral-7B (BUG-02/03 refs)
// SETUP: get free key at openrouter.ai/keys → VITE_OPENROUTER_API_KEY in .env.local

const OR_KEY  = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
const OR_BASE = 'https://openrouter.ai/api/v1';
const CHAT_MODEL   = 'mistralai/mistral-7b-instruct';
const VISION_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct:free';

// BUG-08 FIX: Expanded system prompt with full orthopedic calculation protocols
const SYSTEM_PROMPT = `Você é o OrthoAI, assistente especializado em ortopedia veterinária da plataforma OrtoBolt.

=== DOMÍNIO CLÍNICO ===
Especialidades: TPLO, FHO, TTA, fixação de fraturas (DCP, LCP, pinos intramedulares), cirurgia espinhal (hemilaminectomia, fenestração), substituição articular, artroscopia veterinária.
Espécies: caninos, felinos, equinos, bovinos.

=== PROTOCOLOS DE CÁLCULO CIRÚRGICO — RESPONDA COM PRECISÃO NUMÉRICA ===

1. ÂNGULO DE PLATEAU TIBIAL (TPA / APT):
   - Medição: ângulo entre o plateau tibial e a perpendicular ao eixo longitudinal da tíbia
   - Normal canino: 18–25°; Indicação TPLO: TPA > 23–27°
   - Fórmula de avanço TPLO: avanço_mm = sin(TPA_atual – TPA_alvo) × raio_osteotomia
   - Raio padrão por peso: <15kg → 18mm; 15–30kg → 24mm; 30–50kg → 30mm; >50kg → 36mm
   - TPA alvo pós-TPLO: 5–6°
   - Reporte: TPA medido, TPA alvo, raio recomendado, milímetros de avanço calculados

2. CÁLCULO DE AVANÇO DA TUBEROSIDADE TIBIAL (TTA):
   - Objetivo: tornar ligamento patelar perpendicular ao plateau tibial
   - Espaçador TTA (mm) = distância do ponto A ao eixo longitudinal tibial
   - Fórmula: espaçador = sin(TPA – 90°) × comprimento LP (LP = 3× altura do plateau)
   - Tamanhos disponíveis: 3, 6, 9, 12, 15, 18, 21mm — arredondar para o mais próximo

3. OSTEOMETRIA PRÉ-OPERATÓRIA — FHO (Femoral Head Ostectomy):
   - Linha de osteotomia: distal ao colo femoral, paralela à cortical medial da diáfise
   - Ângulo de corte padrão: 110–115° em relação ao eixo diafisário
   - Para felinos: corte a 2–3mm da cabeça femoral
   - Para caninos: corte a 3–5mm; verificar clearance acetabular (≥2mm)
   - Calcular: comprimento do pescoço a ressecar, ângulo de inclinação, ângulo de anteversão

4. AVALIAÇÃO BIOMECÂNICA — CARGA E IMPLANTE:
   - Força de reação do solo (FRS) estimada = 0.6 × peso corporal (PC)
   - Momento de flexão na fratura/osteotomia = FRS × braço de momento (distância do implante ao ponto de carga)
   - Placa DCP 4.5mm: suporta ≤300Nm; DCP 3.5mm: ≤120Nm; LCP 5.0mm: ≤450Nm
   - Parafusos: cortical 4.5mm → osso cortical >3mm; esponjoso 6.5mm → metáfise
   - Para equinos (PC >400kg): SEMPRE LCP de 5.0mm ou DCP dinâmico largo; mínimo 8 parafusos
   - Calcular: FRS estimada, momento de flexão, classificação do implante necessário

5. MENSURAÇÃO DE ÂNGULOS ARTICULARES — RADIOGRAFIA:
   - Coxofemoral: Índice de Norberg (IN) normal ≥105°; displasia se <105°
   - Cotovelo (FCI): incongruência articular em mm; >2mm = displasia significativa
   - Joelho: ângulo femorotibial normal 135–145°; varo/valgo se >5° de desvio
   - Carpo: ângulo de extensão normal 180°±10°; hiperextensão se >200°
   - Método de medição: identificar centros articulares, traçar eixos longitudinais, medir ângulo entre eixos
   - Reporte todos os ângulos com valores normais de referência e interpretação clínica

6. DOSAGEM FARMACOLÓGICA POR ESPÉCIE E PESO:
   - Meloxicam: cão 0.1mg/kg SID; gato 0.05mg/kg SID (máx 3 dias); equino 0.6mg/kg SID
   - Tramadol: cão 2–5mg/kg TID; gato 1–2mg/kg BID; equino 1–2mg/kg
   - Dexmedetomidina (MPA): cão 5–20mcg/kg IM; gato 10–40mcg/kg IM; equino 10mcg/kg IV
   - Cetamina (indução): cão 5–10mg/kg IV; gato 5–10mg/kg IM; equino 2.2mg/kg IV
   - Morfina: cão 0.3–0.5mg/kg IM; gato 0.1–0.2mg/kg IM; equino 0.05–0.1mg/kg IV

=== FORMATO DE RESPOSTA PARA CÁLCULOS ===
Quando solicitado cálculo, apresente SEMPRE:
1. Dados de entrada utilizados
2. Fórmula aplicada (com valores substituídos)
3. Resultado numérico com unidade
4. Interpretação clínica e recomendação de implante/tamanho
5. Alertas de risco se valores fora do intervalo normal

=== REGRAS GERAIS ===
- Responda sempre em português brasileiro técnico e preciso
- Nunca faça diagnóstico definitivo sem exame físico e imaginologia confirmada
- Sempre cite intervalo de normalidade ao reportar valores
- Para casos críticos, inclua urgência do procedimento`;

async function orRequest(body: object): Promise<string> {
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ortobolt.vercel.app',
      'X-Title': 'OrtoBolt — Veterinary Orthopedics',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return d.choices?.[0]?.message?.content ?? 'Resposta não disponível.';
}

export async function sendChatMessage(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  if (!OR_KEY) {
    return `**OrthoAI — Modo Demonstração** *(OpenRouter/Mistral-7B)*\n\nChave não configurada. Adicione \`VITE_OPENROUTER_API_KEY\` no \`.env.local\`.\n\n**Sua pergunta:** "${userMessage}"\n\nEm produção responderei com:\n- Cálculos precisos de TPA, avanço TPLO/TTA e osteometria FHO\n- Avaliação biomecânica com seleção de implante por peso e espécie\n- Mensuração de ângulos articulares com valores de referência\n- Protocolos farmacológicos com doses calculadas por kg`;
  }
  try {
    return await orRequest({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1200,
    });
  } catch (err) {
    console.error('AI chat error:', err);
    return 'Erro ao comunicar com o serviço de IA. Verifique sua chave OpenRouter e tente novamente.';
  }
}

export async function analyzeImage(imageBase64: string, caseInfo?: Partial<ClinicalCase>): Promise<string> {
  if (!OR_KEY) {
    return `**Análise OrthoVision — Modo Demonstração** *(OpenRouter Vision)*\n\n**Estruturas Identificadas:**\n- Plateau tibial proximal: detectado (confiança: 96%)\n- Tuberosidade tibial cranial: detectada (confiança: 94%)\n- Côndilo femoral lateral: detectado (confiança: 91%)\n- Fíbula proximal: detectada (confiança: 89%)\n\n**Cálculo TPA Estimado:**\nÂngulo de plateau tibial: ~26° (acima do threshold de 23° — TPLO indicado)\n\n**Seleção de Implante (baseada em estimativa de porte):**\n- Raio de osteotomia recomendado: 24–30mm\n- Placa TPLO 4.5mm, 7 furos\n- Avanço estimado: 18–22mm\n\n**Avaliação Biomecânica:**\n- Cortical medial: espessura adequada para parafusos 4.5mm\n- Sem sinais de osteopenia\n\n**Recomendações:**\n1. Confirmar TPA com goniômetro sob fluoroscopia\n2. Radiografia contralateral para comparação\n3. Avaliação de menisco medial obrigatória intraop\n\n*Configure VITE_OPENROUTER_API_KEY para análise real por visão computacional.*`;
  }
  try {
    const ctx = caseInfo
      ? `Paciente: ${caseInfo.patientName}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears}a, ${caseInfo.weightKg}kg. Procedimento planejado: ${caseInfo.procedure}.` : '';
    return await orRequest({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `${SYSTEM_PROMPT}\n\n${ctx}\n\nAnalise esta imagem ortopédica veterinária com precisão máxima. Inclua:\n1. Identificação e qualidade das estruturas anatômicas\n2. Mensuração de ângulos articulares visíveis (com valores de referência)\n3. Cálculo de TPA se tíbia/joelho visível\n4. Avaliação da espessura cortical e qualidade óssea\n5. Identificação de achados patológicos\n6. Recomendação de implante com tamanho específico\n7. Score de confiança para cada estrutura identificada` },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
      max_tokens: 1200,
    });
  } catch (err) {
    console.error('Vision error:', err);
    return 'Erro na análise de imagem. Verifique o formato (JPG/PNG) e tente novamente.';
  }
}

export async function getCaseAISuggestion(caseInfo: Partial<ClinicalCase>): Promise<string> {
  if (!OR_KEY) {
    const weight = caseInfo.weightKg || 0;
    const frs = (weight * 0.6).toFixed(1);
    return `**Sugestão OrthoAI — ${caseInfo.title || 'Caso'}** *(Modo Demonstração)*\n\n**Paciente:** ${caseInfo.patientName} · ${caseInfo.species} · ${caseInfo.weightKg}kg\n\n**Avaliação Biomecânica:**\n- Força de reação do solo estimada: ${frs}kgf (= 0.6 × PC)\n- Procedimento: ${caseInfo.procedure}\n\n**Seleção de Implante:**\n${weight > 40 ? '- Placa LCP 4.5mm ou DCP 4.5mm largo (peso >40kg)\n- Mínimo 6 parafusos (3 proximal + 3 distal ao foco)' : weight > 20 ? '- Placa TPLO 4.5mm, 7 furos\n- Parafusos 4.5mm cortical proximal / 3.5mm distal' : '- Placa 3.5mm DCP\n- Parafusos 3.5mm cortical'}\n\n**Protocolo Pós-Op:**\n1. Crioterapia 20min 3×/dia — 72h\n2. Restrição de exercício 8 semanas\n3. Fisioterapia aquática: início semana 3\n4. Controle radiográfico: 6 e 12 semanas\n\n*Configure VITE_OPENROUTER_API_KEY para sugestões calculadas em tempo real.*`;
  }
  try {
    const ctx = `CASO: ${caseInfo.title}. Paciente: ${caseInfo.patientName}, ${caseInfo.species}, ${caseInfo.breed}, ${caseInfo.ageYears} anos, ${caseInfo.weightKg}kg. Procedimento: ${caseInfo.procedure}. Status: ${caseInfo.status}. Nível de risco: ${caseInfo.riskLevel}. Notas: ${caseInfo.notes || 'sem notas adicionais'}.`;
    return await orRequest({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${ctx}\n\nGere sugestão clínica estruturada com:\n1. Cálculo biomecânico (FRS estimada pelo peso)\n2. Seleção de implante com dimensões específicas\n3. Se joelho/TPLO: calcular avanço estimado pelo peso\n4. Protocolo anestésico com doses pelo peso\n5. Plano de reabilitação pós-operatória\nApresente todos os cálculos com fórmulas e valores numéricos.` },
      ],
      max_tokens: 800,
    });
  } catch (err) {
    console.error('AI suggestion error:', err);
    return 'Erro ao gerar sugestão de IA.';
  }
}
