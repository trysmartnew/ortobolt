import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(__dirname, '..', 'minha-central-de-ia-audit.log');

export interface AuditLog {
  timestamp: string;
  task: string;
  provider: string;
  action: 'READ' | 'MODIFY';
  files: string[];
  success: boolean;
  reason: string;
}

export function logAudit(data: Omit<AuditLog, 'timestamp'>): void {
  const entry = { timestamp: new Date().toISOString(), ...data };
  const logLine = JSON.stringify(entry);
  
  try {
    fs.appendFileSync(LOG_FILE, logLine + '\n', 'utf-8');
  } catch (err) {
    console.error('⚠️ Falha ao gravar no audit log:', err);
  }
}