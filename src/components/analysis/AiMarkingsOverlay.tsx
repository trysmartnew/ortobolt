import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text, Group } from 'react-konva';
import type { MarkingsData, AlignmentCircle, AngleMeasurement, FractureMarker, ROI } from '@/types/markings';

interface AiMarkingsOverlayProps {
  imageUrl: string;
  markings: MarkingsData;
  naturalWidth: number;
  naturalHeight: number;
}

export default function AiMarkingsOverlay({ imageUrl, markings, naturalWidth, naturalHeight }: AiMarkingsOverlayProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: naturalWidth || 800, height: naturalHeight || 600 });

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => setImage(img);
  }, [imageUrl]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width } = entry.contentRect;
        const aspect = (naturalHeight || 600) / (naturalWidth || 800);
        setStageSize({ width, height: Math.round(width * aspect) });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [naturalWidth, naturalHeight]);

  const scaleX = stageSize.width / (naturalWidth || 800);
  const scaleY = stageSize.height / (naturalHeight || 600);

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-black/5">
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={stageSize.width}
              height={stageSize.height}
            />
          )}
        </Layer>
        <Layer>
          {markings.circles.map((c: AlignmentCircle) => (
            <Group key={c.id}>
              <Circle
                x={c.cx * scaleX}
                y={c.cy * scaleY}
                radius={Math.max(6, (c.radius || 30) * Math.min(scaleX, scaleY))}
                stroke={c.stage === 'abnormal' ? '#ef4444' : '#10b981'}
                strokeWidth={2}
                fill={c.stage === 'abnormal' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'}
              />
              <Text
                x={(c.cx * scaleX) + (c.radius || 30) * scaleX}
                y={(c.cy * scaleY) - 14 * scaleY}
                text={c.label || 'Círculo'}
                fill={c.stage === 'abnormal' ? '#ef4444' : '#10b981'}
                fontSize={Math.round(12 * scaleX)}
                fontStyle="bold"
              />
            </Group>
          ))}

          {markings.angles.map((a: AngleMeasurement) => {
            const [p1, p2, p3] = a.points;
            return (
              <Group key={a.id}>
                <Line
                  points={[p1.x * scaleX, p1.y * scaleY, p2.x * scaleX, p2.y * scaleY, p3.x * scaleX, p3.y * scaleY]}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <Text
                  x={p2.x * scaleX}
                  y={(p2.y * scaleY) - 18 * scaleY}
                  text={`${a.type || 'Ângulo'}: ${a.value.toFixed(1)}°`}
                  fill="#1d4ed8"
                  fontSize={Math.round(12 * scaleX)}
                  fontStyle="bold"
                />
              </Group>
            );
          })}

          {markings.markers.map((m: FractureMarker) => (
            <Group key={m.id}>
              <Circle x={m.x * scaleX} y={m.y * scaleY} radius={Math.max(4, 6 * scaleX)} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
              {m.label && (
                <Text x={(m.x * scaleX) + 8 * scaleX} y={(m.y * scaleY) - 6 * scaleY} text={m.label} fill="#ef4444" fontSize={Math.round(11 * scaleX)} fontStyle="bold" />
              )}
            </Group>
          ))}

          {markings.rois.map((roi: ROI) => (
            <Group key={roi.id}>
              <Rect x={roi.x * scaleX} y={roi.y * scaleY} width={(roi.width || 40) * scaleX} height={(roi.height || 40) * scaleY} stroke="#f59e0b" strokeWidth={2} fill="rgba(245,158,11,0.08)" />
              {roi.label && (
                <Text x={roi.x * scaleX} y={(roi.y * scaleY) - 14 * scaleY} text={roi.label} fill="#f59e0b" fontSize={Math.round(11 * scaleX)} fontStyle="bold" />
              )}
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function Rect({ x, y, width, height, stroke, strokeWidth, fill }: { x: number; y: number; width: number; height: number; stroke: string; strokeWidth: number; fill: string }) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
    />
  );
}
