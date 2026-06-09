import fs from 'fs';
import path from 'path';

export function loadProjectContext(): string {
  const contextPath = path.resolve(__dirname, '../ORTOBOLT_CONTEXT.md');
  
  if (!fs.existsSync(contextPath)) {
    console.warn('⚠️  ORTOBOLT_CONTEXT.md não encontrado. Execute: pwsh -File ../update_context.ps1');
    return '';
  }
  
  try {
    const content = fs.readFileSync(contextPath, 'utf-8');
    console.log('📚 Contexto do projeto carregado com sucesso.');
    return content;
  } catch (error) {
    console.warn('⚠️  Erro ao ler ORTOBOLT_CONTEXT.md:', error instanceof Error ? error.message : error);
    return '';
  }
}
export function loadDesignRules(): string {
  const rulesPath = path.resolve(__dirname, '../DESIGN_RULES.md');
  if (!fs.existsSync(rulesPath)) return '';
  try { return fs.readFileSync(rulesPath, 'utf-8'); } catch { return ''; }
}
