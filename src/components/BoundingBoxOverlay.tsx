// src/components/BoundingBoxOverlay.tsx

import React from 'react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface Finding {
  category: string;
  severity: string;
  boundingBox?: BoundingBox;
}

interface BoundingBoxOverlayProps {
  findings: Finding[];
  imageUrl: string;
}

export default function BoundingBoxOverlay({ findings, imageUrl }: BoundingBoxOverlayProps) {
  const boxes = findings.filter(f => f.boundingBox);
  
  if (boxes.length === 0) {
    return (
      <div className="relative w-full h-full">
        <img src={imageUrl} alt="Análise" className="w-full h-full object-contain" />
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      FRATURA: 'border-red-500 bg-red-500/20 text-red-500',
      LUXAÇÃO: 'border-amber-500 bg-amber-500/20 text-amber-500',
      OSTEOARTRITE: 'border-blue-500 bg-blue-500/20 text-blue-500',
      DESALINHAMENTO: 'border-purple-500 bg-purple-500/20 text-purple-500',
    };
    return colors[category] || 'border-gray-500 bg-gray-500/20 text-gray-500';
  };

  return (
    <div className="relative w-full h-full">
      {/* Imagem base */}
      <img src={imageUrl} alt="Análise" className="w-full h-full object-contain" />
      
      {/* Overlay das bounding boxes */}
      {boxes.map((finding, index) => {
        if (!finding.boundingBox) return null;
        
        const { x, y, width, height, confidence } = finding.boundingBox;
        const colorClass = getCategoryColor(finding.category);
        
        return (
          <div
            key={index}
            className={`absolute border-2 ${colorClass} cursor-pointer hover:border-4 transition-all`}
            style={{
              left: `${x / 10}%`,
              top: `${y / 10}%`,
              width: `${width / 10}%`,
              height: `${height / 10}%`,
            }}
            title={`${finding.category}: ${(confidence * 100).toFixed(0)}% confiança`}
          >
            {/* Label da bounding box */}
            <div className="absolute -top-6 left-0 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {finding.category} ({(confidence * 100).toFixed(0)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
}
