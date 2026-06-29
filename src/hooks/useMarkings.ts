import { useState, useCallback, useMemo } from 'react';
import type { MarkingsData, MarkingTool, AlignmentCircle, AngleMeasurement, FractureMarker, ROI } from '../types/markings';

export function useMarkings(initialData?: Partial<MarkingsData>) {
  const [markings, setMarkings] = useState<MarkingsData>({ 
    circles: [], 
    angles: [], 
    markers: [], 
    rois: [], 
    ...initialData 
  });
  
  const [activeTool, setActiveTool] = useState<MarkingTool>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addCircle = useCallback((circle: AlignmentCircle) => {
    setMarkings(prev => ({ ...prev, circles: [...prev.circles, circle] }));
  }, []);

  const updateCircle = useCallback((id: string, updates: Partial<AlignmentCircle>) => {
    setMarkings(prev => ({
      ...prev,
      circles: prev.circles.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  }, []);

  const removeCircle = useCallback((id: string) => {
    setMarkings(prev => ({
      ...prev,
      circles: prev.circles.filter(c => c.id !== id)
    }));
  }, []);

  const addAngle = useCallback((angle: AngleMeasurement) => {
    setMarkings(prev => ({ ...prev, angles: [...prev.angles, angle] }));
  }, []);

  const updateAngle = useCallback((id: string, updates: Partial<AngleMeasurement>) => {
    setMarkings(prev => ({
      ...prev,
      angles: prev.angles.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  }, []);

  const addMarker = useCallback((marker: FractureMarker) => {
    setMarkings(prev => ({ ...prev, markers: [...prev.markers, marker] }));
  }, []);

  const updateMarker = useCallback((id: string, updates: Partial<FractureMarker>) => {
    setMarkings(prev => ({
      ...prev,
      markers: prev.markers.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  }, []);

  const addROI = useCallback((roi: ROI) => {
    setMarkings(prev => ({ ...prev, rois: [...prev.rois, roi] }));
  }, []);

  const updateROI = useCallback((id: string, updates: Partial<ROI>) => {
    setMarkings(prev => ({
      ...prev,
      rois: prev.rois.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  }, []);

  const removeById = useCallback((id: string) => {
    setMarkings(prev => ({
      ...prev,
      circles: prev.circles.filter(c => c.id !== id),
      angles: prev.angles.filter(a => a.id !== id),
      markers: prev.markers.filter(m => m.id !== id),
      rois: prev.rois.filter(r => r.id !== id)
    }));
  }, []);

  const clearAll = useCallback(() => {
    setMarkings({ circles: [], angles: [], markers: [], rois: [] });
  }, []);

  const totalMarkings = useMemo(() => 
    markings.circles.length + markings.angles.length + markings.markers.length + markings.rois.length,
    [markings]
  );

  const hasUnsavedChanges = useMemo(() => totalMarkings > 0, [totalMarkings]);

  return { 
    markings, 
    activeTool, 
    setActiveTool, 
    selectedId, 
    setSelectedId, 
    addCircle, 
    updateCircle, 
    removeCircle, 
    addAngle, 
    updateAngle,
    addMarker, 
    updateMarker,
    addROI, 
    updateROI,
    clearAll, 
    removeById, 
    totalMarkings, 
    hasUnsavedChanges 
  };
}
