import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRadiographs, RadiographItem } from '../../hooks/useRadiographs';
import { RadiographUploader } from './RadiographUploader';
import { MarkingToolbar } from '../markings/MarkingToolbar';
import { MarkingCanvas } from '../markings/MarkingCanvas';
import type { MarkingTool, MarkingsData, AlignmentCircle, AngleMeasurement, FractureMarker, ROI, Point } from '../../types/markings';
import { supabase } from '../../services/supabase';
import { validateMarkings } from '../../schemas/markings';

interface RadiographViewerProps {
  caseId: string;
  markings?: MarkingsData;
}

export const RadiographViewer: React.FC<RadiographViewerProps> = ({ caseId, markings: externalMarkings }) => {
  const { radiographs, loading, error, remove, getSignedUrl } = useRadiographs({ caseId });
  const [selectedRadiographItem, setSelectedRadiographItem] = useState<RadiographItem | null>(null);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [activeTool, setActiveTool] = useState<MarkingTool | null>(null);
  const initialMarkings = useMemo(() => externalMarkings || { circles: [], angles: [], markers: [], rois: [] } as MarkingsData, [externalMarkings]);
  const [markings, setMarkings] = useState<MarkingsData>(initialMarkings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useEffect(() => {
    if (externalMarkings) {
      setMarkings(externalMarkings);
    }
  }, [externalMarkings]);

  useEffect(() => {
    const fetchImageUrl = async () => {
      if (selectedRadiographItem) {
        const url = await getSignedUrl(selectedRadiographItem.filepath);
        setImageUrl(url);
      } else {
        setImageUrl(null);
        setImageDimensions(null);
      }
    };
    fetchImageUrl();
  }, [selectedRadiographItem, getSignedUrl]);

  useEffect(() => {
    if (imageUrl) {
      const img = new window.Image();
      img.src = imageUrl;
      img.onload = () => {
        setImageElement(img);
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        console.error("Failed to load image for annotation.");
        setImageElement(null);
      };
    } else {
      setImageElement(null);
    }
  }, [imageUrl]);

  const handleRemove = async (item: RadiographItem) => {
    if (confirm(`Remover ${item.filename}?`)) {
      await remove(item.id);
    }
  };

  const handleView = async (item: RadiographItem) => {
    setSelectedRadiographItem(item);
    setIsAnnotating(false); // Ensure not in annotating mode when just viewing
  };

  const handleAnnotate = (item: RadiographItem) => {
    setSelectedRadiographItem(item);
    setIsAnnotating(true);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // This handler is for the non-annotating mode image display, not the Konva image
    // The imageElement useEffect already handles dimensions for Konva
    // We keep it here in case the direct image tag is ever used for rendering
    // and its dimensions are needed.
  };

  const handleToolChange = (tool: MarkingTool | null) => {
    setActiveTool(tool);
  };

  const handleClearMarkings = () => {
    setMarkings({
      circles: [],
      angles: [],
      markers: [],
      rois: [],
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveMarkings = useCallback(async () => {
    try {
      const validated = validateMarkings(markings);
      if (!validated) {
        console.error('Marcações inválidas');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data: currentCase, error: fetchError } = await supabase
        .from('clinical_cases')
        .select('exams')
        .eq('id', caseId)
        .single();

      if (fetchError || !currentCase?.exams) {
        console.error('Erro ao carregar exame para salvamento:', fetchError?.message);
        return;
      }

      const exams = currentCase.exams as any[];
      const targetExam = imageUrl
        ? exams.find((e: any) => Array.isArray(e.imageUrls) && e.imageUrls[0] === imageUrl)
        : exams.find((e: any) => e.modality === 'radiograph');

      if (!targetExam) {
        console.error('Exame correspondente não encontrado para salvamento de marcações');
        return;
      }

      const updatedExams = exams.map((e: any) =>
        e.id === targetExam.id
          ? { ...e, markings: validated, markedAt: new Date().toISOString() }
          : e
      );

      const { error: updateError } = await supabase
        .from('clinical_cases')
        .update({ exams: updatedExams })
        .eq('id', caseId);

      if (updateError) throw updateError;

      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Erro ao salvar marcações:', error.message);
    }
  }, [caseId, imageUrl, markings]);

  const handleAddCircle = (circle: AlignmentCircle) => {
    setMarkings(prev => ({ ...prev, circles: [...prev.circles, circle] }));
    setHasUnsavedChanges(true);
  };

  const handleAddAngle = (angle: AngleMeasurement) => {
    setMarkings(prev => ({ ...prev, angles: [...prev.angles, angle] }));
    setHasUnsavedChanges(true);
  };

  const handleAddMarker = (marker: FractureMarker) => {
    setMarkings(prev => ({ ...prev, markers: [...prev.markers, marker] }));
    setHasUnsavedChanges(true);
  };

  const handleAddROI = (roi: ROI) => {
    setMarkings(prev => ({ ...prev, rois: [...prev.rois, roi] }));
    setHasUnsavedChanges(true);
  };

  const handleUpdateMarking = (id: string, updates: any) => {
    setMarkings(prev => ({
      ...prev,
      circles: prev.circles.map(m => m.id === id ? { ...m, ...updates } : m),
      angles: prev.angles.map(m => m.id === id ? { ...m, ...updates } : m),
      markers: prev.markers.map(m => m.id === id ? { ...m, ...updates } : m),
      rois: prev.rois.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
    setHasUnsavedChanges(true);
  };
  

  if (loading) return <div>Carregando...</div>;
  if (error) return <div className="text-red-500">Erro: {error.message}</div>;

  return (
    <div className="space-y-4">
      <RadiographUploader caseId={caseId} />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {radiographs.map((item) => (
          <div key={item.id} className="border p-2 rounded flex flex-col gap-2">
            <div className="h-24 bg-gray-100 flex items-center justify-center text-xs truncate p-1">
              {item.filename}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleView(item)} className="text-blue-600 text-sm">Visualizar</button>
              <button onClick={() => handleAnnotate(item)} className="text-green-600 text-sm">Anotar</button>
              <button onClick={() => handleRemove(item)} className="text-red-600 text-sm">Remover</button>
            </div>
          </div>
        ))}
      </div>

      {selectedRadiographItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="relative" onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking on the image area */}
            <button 
              className="absolute top-2 right-2 text-white text-3xl" 
              onClick={() => { setSelectedRadiographItem(null); setIsAnnotating(false); setImageUrl(null); }}
            >
              &times;
            </button>
            {imageUrl && imageElement && imageDimensions ? (
              <>
                {!isAnnotating && (
                  <img src={imageUrl} alt="Radiografia" className="max-w-full max-h-full rounded" onLoad={handleImageLoad} />
                )}
                {isAnnotating && (
                  <div className="relative">
                    <MarkingToolbar 
                      activeTool={activeTool}
                      onToolChange={handleToolChange}
                      onClear={handleClearMarkings}
                      onSave={handleSaveMarkings}
                      hasUnsavedChanges={hasUnsavedChanges}
                    />
                    <MarkingCanvas 
                      image={imageElement} 
                      width={imageDimensions.width} 
                      height={imageDimensions.height}
                      markings={markings}
                      activeTool={activeTool}
                      onAddCircle={handleAddCircle}
                      onAddAngle={handleAddAngle}
                      onAddMarker={handleAddMarker}
                      onAddROI={handleAddROI}
                      onUpdateMarking={handleUpdateMarking}
                    />
                  </div>
                )}
                {!isAnnotating && (
                  <button 
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-2 rounded"
                    onClick={() => setIsAnnotating(true)}
                  >
                    Anotar
                  </button>
                )}
              </>
            ) : (
              <div>Carregando imagem...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
