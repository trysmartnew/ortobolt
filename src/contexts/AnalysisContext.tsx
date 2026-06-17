import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ImageAnalysis {
  id: string;
  caseId?: string;
  imageData: string;
  analysisResult: string;
  createdAt: string;
  model: string;
  context?: {
    patientName?: string;
    species?: string;
    breed?: string;
    procedure?: string;
  };
}

export interface ComparativeStudy {
  id: string;
  caseId: string;
  images: {
    original: ImageAnalysis;
    followUp?: ImageAnalysis;
  };
  comparisonResult?: string;
  createdAt: string;
}

interface AnalysisContextType {
  currentAnalysis: ImageAnalysis | null;
  setCurrentAnalysis: (analysis: ImageAnalysis | null) => void;
  
  analysisHistory: ImageAnalysis[];
  addAnalysisToHistory: (analysis: ImageAnalysis) => void;
  getAnalysisByCaseId: (caseId: string) => ImageAnalysis | undefined;
  
  comparativeStudies: ComparativeStudy[];
  createComparativeStudy: (caseId: string, original: ImageAnalysis, followUp?: ImageAnalysis) => ComparativeStudy;
  getComparativeStudyByCaseId: (caseId: string) => ComparativeStudy | undefined;
  
  copilotContext: {
    caseId?: string;
    imageData?: string;
    analysisResult?: string;
    clinicalNotes?: string;
  };
  setCopilotContext: (context: Partial<AnalysisContextType['copilotContext']>) => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [currentAnalysis, setCurrentAnalysis] = useState<ImageAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<ImageAnalysis[]>([]);
  const [comparativeStudies, setComparativeStudies] = useState<ComparativeStudy[]>([]);
  const [copilotContext, setCopilotContextState] = useState<AnalysisContextType['copilotContext']>({});

  const addAnalysisToHistory = useCallback((analysis: ImageAnalysis) => {
    setAnalysisHistory(prev => {
      if (prev.some(a => a.id === analysis.id)) {
        return prev.map(a => a.id === analysis.id ? analysis : a);
      }
      return [analysis, ...prev].slice(0, 50);
    });
  }, []);

  const getAnalysisByCaseId = useCallback((caseId: string) => {
    return analysisHistory.find(a => a.caseId === caseId);
  }, [analysisHistory]);

  const createComparativeStudy = useCallback((
    caseId: string,
    original: ImageAnalysis,
    followUp?: ImageAnalysis
  ): ComparativeStudy => {
    const study: ComparativeStudy = {
      id: `study-${Date.now()}`,
      caseId,
      images: { original, followUp },
      createdAt: new Date().toISOString(),
    };
    setComparativeStudies(prev => [study, ...prev]);
    return study;
  }, []);

  const getComparativeStudyByCaseId = useCallback((caseId: string) => {
    return comparativeStudies.find(s => s.caseId === caseId);
  }, [comparativeStudies]);

  const setCopilotContext = useCallback((context: Partial<AnalysisContextType['copilotContext']>) => {
    setCopilotContextState(prev => ({ ...prev, ...context }));
  }, []);

  return (
    <AnalysisContext.Provider value={{
      currentAnalysis,
      setCurrentAnalysis,
      analysisHistory,
      addAnalysisToHistory,
      getAnalysisByCaseId,
      comparativeStudies,
      createComparativeStudy,
      getComparativeStudyByCaseId,
      copilotContext,
      setCopilotContext,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be inside AnalysisProvider');
  return ctx;
}
