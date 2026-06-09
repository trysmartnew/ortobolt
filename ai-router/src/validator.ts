import fs from 'fs';
import path from 'path';

const FORBIDDEN_PATTERNS = [
  'node_modules',
  '.env',
  '.git',
  'dist',
  'build'
];

export function validateFilePath(filePath: string, projectRoot: string): { valid: boolean; error?: string } {
  // 1. Evitar path traversal
  const absolutePath = path.resolve(projectRoot, filePath);
  if (!absolutePath.startsWith(projectRoot)) {
    return { valid: false, error: "Tentativa de Path Traversal detectada." };
  }

  // 2. Verificar padrões proibidos
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (filePath.includes(pattern)) {
      return { valid: false, error: `Acesso negado: o caminho contém '${pattern}' (proibido).` };
    }
  }

  // 3. Verificar se o arquivo existe (bloqueio de alucinação)
  if (!fs.existsSync(absolutePath)) {
    return { valid: false, error: `Arquivo inexistente: ${filePath}. A IA alucinou um arquivo.` };
  }

  return { valid: true };
}
