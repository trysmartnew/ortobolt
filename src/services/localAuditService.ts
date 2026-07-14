import { z } from 'zod'; // Assumindo presença de Zod no projeto, caso contrário ajustar para lógica manual

const RefinementLogSchema = z.object({
  caseId: z.string(),
  context: z.object({
    patientName: z.string().optional(),
    species: z.string().optional(),
    breed: z.string().optional(),
    weightKg: z.number().optional(),
    procedure: z.string().optional(),
    clinicalNotes: z.string().optional(),
  }).passthrough(),
  finalRefinement: z.string(),
});

/**
 * Serviço de auditoria local utilizando IndexedDB para logs de refinamento clínico.
 */

const DB_NAME = 'OrtoBoltAuditDB';
const STORE_NAME = 'clinical_refinement_logs';

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface RefinementLog {
  id: string; // timestamp
  caseId: string;
  timestamp: string;
  context: Record<string, any>;
  finalRefinement: string;
}

export const localAuditService = {
  async save(log: Omit<RefinementLog, 'id' | 'timestamp'>) {
    // Validação Schema
    const result = RefinementLogSchema.safeParse(log);
    if (!result.success) {
      console.error('Falha na validação de log local:', result.error);
      return null;
    }

    const db = await getDB();
    const entry: RefinementLog = {
      ...result.data,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(entry);
      request.onsuccess = () => resolve(entry);
      request.onerror = () => reject(request.error);
    });
  },

  async getAll(): Promise<RefinementLog[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};
