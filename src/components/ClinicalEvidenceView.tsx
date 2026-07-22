import React from 'react';
import type { ClinicalEvidence } from '@/schemas/clinicalEvidence';

interface Props {
  evidence: ClinicalEvidence;
}

export const ClinicalEvidenceView: React.FC<Props> = ({ evidence }) => {
  return (
    <div className="p-4 border border-white/10 rounded-lg bg-surface shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Evidência Clínica</h3>
        <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">
          Confiança: {(evidence.confidence * 100).toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {evidence.measurements.angle && (
          <div><span className="text-gray-500">Ângulo:</span> {evidence.measurements.angle.toFixed(1)}°</div>
        )}
        {evidence.measurements.displacement && (
          <div><span className="text-gray-500">Deslocamento:</span> {evidence.measurements.displacement.toFixed(1)}mm</div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm">Achados:</h4>
        <ul className="list-disc pl-4 space-y-1">
          {evidence.findings.map((finding, idx) => (
            <li key={idx} className="text-sm">
              <span className="font-medium">{finding.location}:</span> {finding.description} 
              <span className="text-xs text-gray-400 ml-2">({finding.severity})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
