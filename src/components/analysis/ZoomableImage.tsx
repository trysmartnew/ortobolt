import { type CSSProperties, type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import AiMarkingsOverlay from '@/components/analysis/AiMarkingsOverlay';
import type { MarkingsData } from '@/types/markings';

interface ZoomableImageProps {
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  markings?: MarkingsData | null;
  viewportClassName?: string;
  imgClassName?: string;
  maxZoom?: number;
}

const MIN_ZOOM = 1;

export default function ZoomableImage({ imageUrl, naturalWidth, naturalHeight, markings = null, viewportClassName = 'w-full', imgClassName = 'block w-full h-auto select-none', maxZoom = 8 }: ZoomableImageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  useEffect(() => { stateRef.current = { zoom, pan }; }, [zoom, pan]);
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [imageUrl]);

  const clampPan = useCallback((z: number, p: { x: number; y: number }) => {
    const vp = viewportRef.current; const im = imgRef.current;
    if (!vp || !im) return p;
    const vw = vp.clientWidth; const vh = vp.clientHeight;
    const cw = im.offsetWidth * z; const ch = im.offsetHeight * z;
    return {
      x: cw <= vw ? (vw - cw) / 2 : Math.min(0, Math.max(vw - cw, p.x)),
      y: ch <= vh ? (vh - ch) / 2 : Math.min(0, Math.max(vh - ch, p.y)),
    };
  }, []);

  const applyZoom = useCallback((next: number, cx: number, cy: number) => {
    const vp = viewportRef.current; if (!vp) return;
    const z = Math.min(maxZoom, Math.max(MIN_ZOOM, next));
    const { zoom: z0, pan: p0 } = stateRef.current;
    const bx = (cx - p0.x) / z0; const by = (cy - p0.y) / z0;
    const clamped = clampPan(z, { x: cx - z * bx, y: cy - z * by });
    setZoom(z); setPan(clamped);
  }, [clampPan, maxZoom]);

  useEffect(() => {
    const vp = viewportRef.current; if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      applyZoom(stateRef.current.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [applyZoom]);

  const dragRef = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });
  const onMouseDown = useCallback((e: ReactMouseEvent) => {
    if (e.button !== 0 || stateRef.current.zoom <= 1) return;
    e.preventDefault();
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, px: stateRef.current.pan.x, py: stateRef.current.pan.y };
    setDragging(true);
    const move = (ev: MouseEvent) => { if (!dragRef.current.active) return; setPan(clampPan(stateRef.current.zoom, { x: dragRef.current.px + (ev.clientX - dragRef.current.sx), y: dragRef.current.py + (ev.clientY - dragRef.current.sy) })); };
    const up = () => { dragRef.current.active = false; setDragging(false); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }, [clampPan]);

  const onDoubleClick = useCallback((e: ReactMouseEvent) => {
    const r = viewportRef.current?.getBoundingClientRect(); if (!r) return;
    if (stateRef.current.zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); } else applyZoom(2.5, e.clientX - r.left, e.clientY - r.top);
  }, [applyZoom]);

  const zoomBy = useCallback((f: number) => { const vp = viewportRef.current; if (!vp) return; applyZoom(stateRef.current.zoom * f, vp.clientWidth / 2, vp.clientHeight / 2); }, [applyZoom]);
  const reset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const tf: CSSProperties = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', transition: dragging ? 'none' : 'transform 90ms ease-out', willChange: 'transform' };
  const pct = Math.round(zoom * 100);
  const moved = zoom > 1 || pan.x !== 0 || pan.y !== 0;
  const cursor = dragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default';

  return (
    <div ref={viewportRef} className={`relative overflow-hidden ${viewportClassName}`} style={{ cursor, touchAction: 'none' }} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick} role="group" aria-label="Radiografia com zoom: roda para ampliar, arraste para mover, duplo-clique alterna">
      <img ref={imgRef} src={imageUrl} alt="Radiografia" draggable={false} className={imgClassName} style={tf} />
      {markings && (
        <div className="pointer-events-none absolute inset-0" style={tf}>
          <AiMarkingsOverlay imageUrl={imageUrl} markings={markings} naturalWidth={naturalWidth} naturalHeight={naturalHeight} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/55 px-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <button type="button" aria-label="Reduzir zoom" onMouseDown={(e) => e.stopPropagation()} onClick={() => zoomBy(1 / 1.3)} disabled={zoom <= MIN_ZOOM} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-90 disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
          <span className={`min-w-[3.2rem] text-center font-mono text-[11px] tabular-nums transition-colors ${zoom > 1 ? 'text-[#5eead4]' : 'text-white/55'}`}>{pct}%</span>
          <button type="button" aria-label="Aumentar zoom" onMouseDown={(e) => e.stopPropagation()} onClick={() => zoomBy(1.3)} disabled={zoom >= maxZoom} className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-90 disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
          <div className={`mx-0.5 h-4 w-px bg-white/15 transition-opacity ${moved ? 'opacity-100' : 'opacity-0'}`} />
          <button type="button" aria-label="Resetar zoom" onMouseDown={(e) => e.stopPropagation()} onClick={reset} className={`flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white active:scale-90 ${moved ? 'opacity-100' : 'pointer-events-none opacity-0'}`}><RotateCcw className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}