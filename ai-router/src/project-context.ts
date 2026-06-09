import fs from 'fs';
import path from 'path';

export function injectFileContext(filePath: string, projectRoot: string): string {
  const absolutePath = path.resolve(projectRoot, filePath);
  
  if (!fs.existsSync(absolutePath)) {
    return `[AVISO: Arquivo ${filePath} não existe no projeto]`;
  }
  
  const content = fs.readFileSync(absolutePath, 'utf-8');
  
  return `
📁 CONTEÚDO ATUAL DO ARQUIVO ${filePath}:
\`\`\`typescript
${content}
\`\`\`
`;
}