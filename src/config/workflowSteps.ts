// src/config/workflowSteps.ts
// Configuracao estatica dos workflows de analise.
// Escopo tecnicamente sustentado: analysis (4 steps) + comparative (5 steps).

export interface WorkflowStep {
  id: string;
  label: string;
}

export const WORKFLOW_STEPS: Record<string, WorkflowStep[]> = {
  analysis: [
    { id: 'upload', label: 'Upload' },
    { id: 'analysis', label: 'Analise' },
    { id: 'report', label: 'Laudo' },
    { id: 'integration', label: 'Integracao' },
  ],
  comparative: [
    { id: 'case', label: 'Caso' },
    { id: 'upload', label: 'Upload' },
    { id: 'comparison', label: 'Comparacao' },
    { id: 'analysis', label: 'Analise IA' },
    { id: 'integration', label: 'Integracao' },
  ],
};
