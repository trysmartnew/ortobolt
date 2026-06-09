import dotenv from "dotenv";
dotenv.config();

import { runAgent } from "./agent";
import { validateFilePath } from "./validator";
import { applyPatches } from "./diff-engine";
import { logAudit } from "./logger";
import path from "path";
import readline from "readline";
import fs from "fs";

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function getProjectRoot(): string {
  const envRoot = process.env.ORTOBOLT_ROOT;
  if (envRoot) {
    if (!fs.existsSync(envRoot)) {
      console.error(`❌ ORTOBOLT_ROOT definido mas diretório não existe: ${envRoot}`);
      process.exit(1);
    }
    return envRoot;
  }
  return path.resolve(__dirname, '../..');
}

function parseArgs(): { customPrompt: string; targetFiles: string[] } {
  const args = process.argv.slice(2);
  if (args[0] === '--prompt-file' || args[0] === '-f') {
    const promptFilePath = args[1];
    if (!promptFilePath || !fs.existsSync(promptFilePath)) {
      console.error(`Arquivo de prompt nao encontrado: ${promptFilePath}`);
      process.exit(1);
    }
    const customPrompt = fs.readFileSync(promptFilePath, 'utf-8').trim();
    const targetFiles = args.slice(2);
    if (targetFiles.length === 0) {
      console.error('Forneca ao menos um arquivo apos --prompt-file.');
      process.exit(1);
    }
    return { customPrompt, targetFiles };
  }
  const customPrompt = args[0];
  const targetFiles = args.slice(1);
  if (!customPrompt || targetFiles.length === 0) {
    console.error('Uso: npx ts-node src/index.ts "tarefa" "src/arq.ts"');
    console.error('  ou: npx ts-node src/index.ts --prompt-file prompt.txt "src/arq.ts"');
    process.exit(1);
  }
  return { customPrompt, targetFiles };
}

async function main() {
  const { customPrompt, targetFiles } = parseArgs();

  const projectRoot = getProjectRoot();
  
  console.log(`🚀 Iniciando OrtoBolt Agent`);
  console.log(`🎯 Arquivos Alvo: ${targetFiles.join(', ')}`);
  console.log(`📝 Tarefa: "${customPrompt}"`);
  console.log(`📂 Repositório: ${projectRoot}`);

  const agentResponse = await runAgent(customPrompt, targetFiles, projectRoot);
  const lastProvider = "groq";

  if (agentResponse) {
    console.log("\n=== RESPOSTA DA IA ===");
    console.log(`Ação: ${agentResponse.action}`);
    console.log(`Motivo: ${agentResponse.reasoning}`);

    // Caso READ: exibir análise
    if (agentResponse.action === 'READ' && agentResponse.analysis) {
      console.log("\n📊 ANÁLISE:");
      console.log("─".repeat(60));
      console.log(agentResponse.analysis);
      console.log("─".repeat(60));
      
      logAudit({
        task: customPrompt,
        provider: lastProvider,
        action: agentResponse.action,
        files: targetFiles,
        success: true,
        reason: "Análise concluída"
      });
      return;
    }

    // Caso MODIFY: validar arquivos e aplicar patches
    if (agentResponse.action === 'MODIFY' && agentResponse.modifications) {
      let allValid = true;

      for (const mod of agentResponse.modifications) {
        console.log(`\n📄 Arquivo: ${mod.filePath}`);
        const validation = validateFilePath(mod.filePath, projectRoot);
        if (validation.valid) {
          console.log(`   ✅ VALIDADO - ${mod.searchReplace.length} patch(es)`);
        } else {
          console.error(`   ❌ BLOQUEADO: ${validation.error}`);
          allValid = false;
        }
      }

      if (!allValid) {
        logAudit({
          task: customPrompt,
          provider: lastProvider,
          action: agentResponse.action,
          files: agentResponse.modifications.map(m => m.filePath),
          success: false,
          reason: "Bloqueio de segurança em arquivo inválido"
        });
        process.exit(1);
      }

      console.log("\n⚠️  ATENÇÃO: Patches serão aplicados aos arquivos reais!");
      const answer = await promptUser("Deseja prosseguir? (y/n): ");

      if (answer.toLowerCase() !== 'y') {
        console.log("❌ Operação cancelada pelo usuário.");
        logAudit({
          task: customPrompt,
          provider: lastProvider,
          action: agentResponse.action,
          files: agentResponse.modifications.map(m => m.filePath),
          success: false,
          reason: "Cancelado pelo usuário"
        });
        process.exit(0);
      }

      console.log("⚙️ Aplicando patches no código real...");
      const result = await applyPatches(agentResponse.modifications, projectRoot);

      logAudit({
        task: customPrompt,
        provider: lastProvider,
        action: agentResponse.action,
        files: agentResponse.modifications.map(m => m.filePath),
        success: result.success,
        reason: result.message
      });

      if (result.success) {
        console.log(`✅ SUCESSO: ${result.message}`);
      } else {
        console.error(`❌ FALHA: ${result.message}`);
      }
    }
  } else {
    console.log("❌ O agente não conseguiu gerar uma resposta válida.");
    logAudit({
      task: customPrompt,
      provider: lastProvider,
      action: 'READ',
      files: targetFiles,
      success: false,
      reason: "Falha de validação Zod"
    });
  }
}

main().catch(console.error);