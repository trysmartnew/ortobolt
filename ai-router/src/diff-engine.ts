import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'child_process';
import type { Modification } from './types';

function normalizeWhitespace(str: string): string {
  return str.replace(/\r\n/g, '\n').replace(/\t/g, '  ').trim();
}

export async function applyPatches(modifications: Modification[], projectRoot: string): Promise<{ success: boolean; message: string }> {
  const backups: Map<string, string> = new Map();
  const originalContents: Map<string, string> = new Map();

  for (const mod of modifications) {
    const absolutePath = path.resolve(projectRoot, mod.filePath);
    const backupPath = `${absolutePath}.ortobak`;

    try {
      const originalContent = fs.readFileSync(absolutePath, 'utf-8');
      originalContents.set(absolutePath, originalContent);
      fs.copyFileSync(absolutePath, backupPath);
      backups.set(absolutePath, backupPath);
    } catch (err) {
      for (const [origPath, bakPath] of backups.entries()) {
        fs.copyFileSync(bakPath, origPath);
        fs.unlinkSync(bakPath);
      }
      return { success: false, message: `Falha ao criar backup de ${mod.filePath}` };
    }
  }

  try {
    const modifiedContents: Map<string, string> = new Map();

    for (const mod of modifications) {
      const absolutePath = path.resolve(projectRoot, mod.filePath);
      let content = originalContents.get(absolutePath) || '';

      for (const patch of mod.searchReplace) {
        if (content.includes(patch.search)) {
          content = content.replace(patch.search, patch.replace);
        } else {
          const normalizedContent = normalizeWhitespace(content);
          const normalizedSearch = normalizeWhitespace(patch.search);
          if (normalizedContent.includes(normalizedSearch)) {
            content = content.replace(new RegExp(patch.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 's'), patch.replace);
          } else {
            throw new Error(`Trecho exato não encontrado em ${mod.filePath}`);
          }
        }
      }

      modifiedContents.set(absolutePath, content);
      fs.writeFileSync(absolutePath, content, 'utf-8');
    }

    console.log("🔍 Validando compilação de todos os arquivos (tsc --noEmit)...");
    try {
      execSync('npx tsc --noEmit', { cwd: projectRoot, stdio: 'pipe' });
    } catch (tscError) {
      throw new Error(`O patch introduziu erro de compilação TypeScript`);
    }

    return { success: true, message: "Patches aplicados e compilados com sucesso." };

  } catch (error) {
    console.log("🔄 Executando rollback atômico de todos os arquivos...");
    for (const [origPath, bakPath] of backups.entries()) {
      fs.copyFileSync(bakPath, origPath);
    }
    return {
      success: false,
      message: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}. Rollback executado.`
    };
  } finally {
    for (const bakPath of backups.values()) {
      if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
    }
  }
}