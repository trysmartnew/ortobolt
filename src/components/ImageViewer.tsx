import React, { useState, useRef, useEffect } from 'react';
import { X, Download, RotateCw, Ruler, Triangle } from 'lucide-react';
import { Button } from '@/components/ui';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Measurement {
  type: 'linear' | 'angular';
  points: Point[];
  value: string;
}

export default function ImageViewer({ src, onClose }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1.0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [activeTool, setActiveTool] = useState<'none' | 'linear' | 'angular'>('none');
  const [points, setPoints] = useState<Point[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw measurements
    measurements.forEach(m => {
      if (m.type === 'linear' && m.points.length === 2) {
        const [p1, p2] = m.points;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(m.value + 'px', midX + 5, midY - 5);
      } else if (m.type === 'angular' && m.points.length === 3) {
        const [p1, p2, p3] = m.points;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(m.value, p2.x + 5, p2.y - 5);
      }
    });

    // Draw pending points
    points.forEach(p => {
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [measurements, points]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (activeTool === 'none') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      const newPoints = [...points, point];
      setPoints(newPoints);

      if (activeTool === 'linear' && newPoints.length === 2) {
        const dist = Math.sqrt(
          Math.pow(newPoints[1].x - newPoints[0].x, 2) +
          Math.pow(newPoints[1].y - newPoints[0].y, 2)
        ).toFixed(1);
        setMeasurements(prev => [...prev, { type: 'linear', points: newPoints, value: dist }]);
        setPoints([]);
      } else if (activeTool === 'angular' && newPoints.length === 3) {
        const AB = { x: newPoints[0].x - newPoints[1].x, y: newPoints[0].y - newPoints[1].y };
        const CB = { x: newPoints[2].x - newPoints[1].x, y: newPoints[2].y - newPoints[1].y };
        const dot = AB.x * CB.x + AB.y * CB.y;
        const magAB = Math.sqrt(AB.x ** 2 + AB.y ** 2);
        const magCB = Math.sqrt(CB.x ** 2 + CB.y ** 2);
        const angle = (Math.acos(dot / (magAB * magCB)) * 180 / Math.PI).toFixed(1);
        setMeasurements(prev => [...prev, { type: 'angular', points: newPoints, value: angle }]);
        setPoints([]);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none' && isDragging && dragStart) {
      setPanOffset(prev => ({
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'imagem-ortobolt.jpg';
    link.click();
  };

  const resetAll = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/10">
        <h2 className="text-white text-sm font-bold">Visualizador de Imagem · OrtoBolt</h2>
        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}
            className="w-8 h-8 rounded bg-slate-800 text-white hover:bg-slate-700 flex items-center justify-center"
          >
            −
          </button>
          <span className="text-white text-xs w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
            className="w-8 h-8 rounded bg-slate-800 text-white hover:bg-slate-700 flex items-center justify-center"
          >
            +
          </button>
          <button
            onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
            className="px-2 py-1 rounded bg-slate-800 text-white text-xs hover:bg-slate-700"
          >
            1:1
          </button>
        </div>

        <span className="text-white/30">|</span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="px-2 py-1 rounded bg-slate-800 text-white text-xs hover:bg-slate-700 flex items-center gap-1"
          >
            <RotateCw size={12} /> 90°
          </button>
          <button
            onClick={resetAll}
            className="px-2 py-1 rounded bg-slate-800 text-white text-xs hover:bg-slate-700"
          >
            Reset
          </button>
        </div>

        <span className="text-white/30">|</span>

        <button
          onClick={handleDownload}
          className="px-2 py-1 rounded bg-slate-800 text-white text-xs hover:bg-slate-700 flex items-center gap-1"
        >
          <Download size={12} /> Download
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          style={{ cursor: activeTool !== 'none' ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Visualização"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) rotate(${rotation}deg) scale(${zoom})`,
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-slate-900 border-l border-white/10 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-white text-xs font-semibold mb-3">Ajustes de Imagem</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-white/70 text-xs block mb-1">Brilho {brightness}%</label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-[#0056b3]"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-xs block mb-1">Contraste {contrast}%</label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-[#0056b3]"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setBrightness(100); setContrast(100); }}
                  className="w-full"
                >
                  Resetar filtros
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-white text-xs font-semibold mb-3">Ferramentas de Medição</h3>
              <div className="space-y-2">
                <button
                  onClick={() => { setActiveTool(t => t === 'linear' ? 'none' : 'linear'); setPoints([]); }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    activeTool === 'linear'
                      ? 'bg-[#0056b3] text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Ruler size={14} />
                  Medida Linear
                </button>
                <button
                  onClick={() => { setActiveTool(t => t === 'angular' ? 'none' : 'angular'); setPoints([]); }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    activeTool === 'angular'
                      ? 'bg-[#0056b3] text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Triangle size={14} />
                  Medida Angular
                </button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setMeasurements([]); setPoints([]); }}
                  className="w-full"
                >
                  Limpar medições
                </Button>
                <p className="text-xs text-slate-500 italic">
                  ⚠ Medidas em pixels. Sem calibração DICOM.
                </p>
              </div>

              {measurements.length > 0 && (
                <div className="mt-3 space-y-1">
                  <h4 className="text-white/70 text-xs font-semibold">Medições:</h4>
                  {measurements.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-white/80 bg-slate-800 rounded px-2 py-1">
                      <span>{m.type === 'linear' ? '📏' : '📐'} {m.value}</span>
                      <button
                        onClick={() => setMeasurements(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}