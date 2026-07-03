import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ComparisonSyncContextValue {
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;
}

const ComparisonSyncContext = createContext<ComparisonSyncContextValue | undefined>(undefined);

export function ComparisonSyncProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [overlayOpacity, setOverlayOpacity] = useState(50);

  const value = useMemo(() => ({
    zoom,
    setZoom,
    pan,
    setPan,
    overlayOpacity,
    setOverlayOpacity,
  }), [zoom, pan, overlayOpacity]);

  return (
    <ComparisonSyncContext.Provider value={value}>
      {children}
    </ComparisonSyncContext.Provider>
  );
}

export function useComparisonSync() {
  const context = useContext(ComparisonSyncContext);
  if (!context) {
    throw new Error('useComparisonSync must be used within a ComparisonSyncProvider');
  }
  return context;
}
