import { askAI } from "./ai-client";
import { AgentResponseSchema, AgentResponse } from "./types";
import { injectFileContext } from "./project-context";
import { loadProjectContext, loadDesignRules } from "./context-loader";

function sanitizeJson(raw: string): string {
  const validEscapes = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
  let result = '';
  let inString = false;
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (!inString) {
      if (c === '"') inString = true;
      result += c;
      i++;
      continue;
    }
    if (c === '\\') {
      const next = raw[i + 1] || '';
      if (validEscapes.has(next)) {
        result += c + next;
        i += 2;
      } else {
        result += '\\\\' + next;
        i += 2;
      }
      continue;
    }
    if (c === '"') {
      inString = false;
      result += c;
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      result += '\\n';
      i++;
      continue;
    }
    if (c === '\t') {
      result += ' ';
      i++;
      continue;
    }
    result += c;
    i++;
  }
  return result;
}

export async function runAgent(task: string, targetFiles: string[], projectRoot: string): Promise<AgentResponse | null> {
  const fileContexts = targetFiles.map(f => injectFileContext(f, projectRoot)).join('\n\n');
  const projectContext = loadProjectContext();
  const designRules = loadDesignRules();

  const prompt = `
Você é um engenheiro de software trabalhando EM UM REPOSITÓRIO REAL chamado OrtoBolt.
${projectContext ? `📖 CONTEXTO DO PROJETO:\n${projectContext}\n` : ''}
${designRules ? `🎨 REGRAS DE DESIGN:\n${designRules}\n` : ''}
${fileContexts}

🔒 REGRA ABSOLUTA (CRÍTICA DE SEGURANÇA)
- Você NÃO pode inventar arquivos, pastas, módulos ou código que não existe.
- Ação 'CREATE' é ESTRITAMENTE PROIBIDA. Use apenas 'READ' ou 'MODIFY'.

🎯 TAREFA
${task}

⚙️ FORMATO DE RESPOSTA OBRIGATÓRIO (JSON ESTRITO)
Retorne APENAS um objeto JSON válido com esta estrutura:

PARA TAREFAS DE ANÁLISE (apenas leitura/informação):
{
  "reasoning": "string (breve explicação)",
  "action": "READ",
  "analysis": "string (resultado completo da análise em texto estruturado)"
}

PARA TAREFAS DE MODIFICAÇÃO:
{
  "reasoning": "string (breve explicação)",
  "action": "MODIFY",
  "modifications": [
    {
      "filePath": "string (caminho relativo exato)",
      "searchReplace": [
        { "search": "string (CÓPIA EXATA do trecho)", "replace": "string" }
      ]
    }
  ]
}

📌 REGRAS CRÍTICAS:
1. Use action "READ" quando a tarefa for APENAS análise, listagem ou consulta
2. Use action "MODIFY" quando a tarefa envolver alteração de código
3. Para MODIFY: o campo 'search' DEVE ser cópia LITERAL do arquivo
4. Copie espaços, quebras de linha e indentação EXATAMENTE como aparecem
5. SEMPRE consulte src/components/ui.tsx antes de criar componentes visuais

NÃO inclua markdown, blocos de código, ou texto fora do JSON.
`;

  try {
    console.log("🤖 Chamando IA...");
    const rawResponse = await askAI(prompt);
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedJson = JSON.parse(sanitizeJson(cleanJson));
    const validatedResponse = AgentResponseSchema.parse(parsedJson);
    console.log("✅ Resposta da IA validada com sucesso pelo Zod.");
    return validatedResponse;
  } catch (error) {
    console.error("❌ ERRO DE VALIDAÇÃO OU PARSING:");
    if (error instanceof Error) console.error(error.message);
    else console.error(error);
    return null;
  }
}