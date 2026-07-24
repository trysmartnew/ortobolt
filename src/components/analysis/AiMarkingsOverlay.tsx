import { useRef, useEffect, useState, type ReactNode } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Text, Group, Rect } from 'react-konva';
import type { MarkingsData, AlignmentCircle, AngleMeasurement, FractureMarker, ROI } from '@/types/markings';

interface AiMarkingsOverlayProps {
  imageUrl: string;
  markings: MarkingsData;
  naturalWidth: number;
  naturalHeight: number;
}

const GRID_SPACING = 60;

function CornerLines({ x, y, w, h, size, stroke, strokeWidth }: { x: number; y: number; w: number; h: number; size: number; stroke: string; strokeWidth: number }) {
  return (
    <Group>
      <Line points={[x, y, x + w, y]} stroke={stroke} strokeWidth={strokeWidth} />
      <Line points={[x, y, x, y + h]} stroke={stroke} strokeWidth={strokeWidth} />
    </Group>
  );
}

function Badge({ x, y, text, fontSize }: { x: number; y: number; text: string; fontSize: number }) {
  const padding = 3;
  const textWidth = text.length * fontSize * 0.6;
  const width = textWidth + padding * 2;
  const height = fontSize + padding * 2;

  return (
    <Group x={x} y={y}>
      <Rect
        width={width}
        height={height}
        fill="rgba(14,16,17,0.8)"
        stroke="rgba(41, 163, 153, 0.35)"
        strokeWidth={1}
        cornerRadius={2}
      />
      <Text
        text={text}
        fontSize={fontSize}
        fill="#29a399"
        fontStyle="bold"
        x={padding}
        y={padding * 0.5}
      />
    </Group>
  );
}

function GuideLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <Line
      points={[x1, y1, x2, y2]}
      stroke="#29a399"
      strokeWidth={0.5}
      opacity={0.4}
      dash={[2, 2]}
    />
  );
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

  const gridLines: ReactNode[] = [];
  const cols = Math.ceil((naturalWidth || 800) / GRID_SPACING) + 1;
  const rows = Math.ceil((naturalHeight || 600) / GRID_SPACING) + 1;

  for (let i = 0; i < cols; i++) {
    const x = i * GRID_SPACING * scaleX;
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[x, 0, x, stageSize.height]}
        stroke="#29a399"
        strokeWidth={0.5}
        opacity={0.15}
      />
    );
  }
  for (let j = 0; j < rows; j++) {
    const y = j * GRID_SPACING * scaleY;
    gridLines.push(
      <Line
        key={`h-${j}`}
        points={[0, y, stageSize.width, y]}
        stroke="#29a399"
        strokeWidth={0.5}
        opacity={0.15}
      />
    );
  }

  return (
    <div ref={containerRef} className="w-full">
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
          {gridLines}

          {markings.circles.map((c: AlignmentCircle) => {
            const cx = c.cx * stageSize.width;
            const cy = c.cy * stageSize.height;
            const radius = Math.max(6, (c.radius || 0.03) * Math.min(stageSize.width, stageSize.height));
            const labelX = cx + radius + 4;
            const labelY = cy - 14;

            return (
              <Group key={c.id}>
                <Circle
                  x={cx}
                  y={cy}
                  radius={radius}
                  stroke={c.stage === 'abnormal' ? 'var(--color-error)' : 'var(--color-success)'}
                  strokeWidth={2}
                  fill={c.stage === 'abnormal' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'}
                />
                <GuideLine x1={cx + radius} y1={cy} x2={labelX} y2={labelY} />
                <Badge x={labelX} y={labelY} text={c.label || 'Círculo'} fontSize={10} />
              </Group>
            );
          })}

          {markings.angles.map((a: AngleMeasurement) => {
            const [p1, p2, p3] = a.points;
            const vertexX = p2.x * stageSize.width;
            const vertexY = p2.y * stageSize.height;
            const labelX = vertexX;
            const labelY = vertexY - 18;

            return (
              <Group key={a.id}>
                <Line
                  points={[
                    p1.x * stageSize.width, p1.y * stageSize.height,
                    vertexX, vertexY,
                    p3.x * stageSize.width, p3.y * stageSize.height
                  ]}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <GuideLine x1={vertexX} y1={vertexY} x2={labelX} y2={labelY} />
                <Badge x={labelX} y={labelY} text={`${a.type || 'Ângulo'}: ${a.value.toFixed(1)}°`} fontSize={10} />
              </Group>
            );
          })}

          {markings.markers.map((m: FractureMarker) => (
            <Group key={m.id}>
              <Circle x={m.x * stageSize.width} y={m.y * stageSize.height} radius={6} fill="var(--color-error)" stroke="#ffffff" strokeWidth={2} />
              {m.label && (
                <>
                  <GuideLine x1={m.x * stageSize.width} y1={m.y * stageSize.height} x2={(m.x * stageSize.width) + 8} y2={(m.y * stageSize.height) - 6} />
                  <Badge x={(m.x * stageSize.width) + 8} y={(m.y * stageSize.height) - 6} text={m.label} fontSize={10} />
                </>
              )}
            </Group>
          ))}

          {markings.rois.map((roi: ROI) => {
            const x = roi.x * stageSize.width;
            const y = roi.y * stageSize.height;
            const w = (roi.width || 0.2) * stageSize.width;
            const h = (roi.height || 0.2) * stageSize.height;
            const cornerSize = Math.min(w, h, 20) * 0.25;

            return (
              <Group key={roi.id}>
                <CornerLines x={x} y={y} w={1} h={1} size={cornerSize} stroke="#29a399" strokeWidth={2} />
                <CornerLines x={x + w} y={y} w={-1} h={1} size={cornerSize} stroke="#29a399" strokeWidth={2} />
                <CornerLines x={x} y={y + h} w={1} h={-1} size={cornerSize} stroke="#29a399" strokeWidth={2} />
                <CornerLines x={x + w} y={y + h} w={-1} h={-1} size={cornerSize} stroke="#29a399" strokeWidth={2} />
                {roi.label && (
                  <>
                    <GuideLine x1={x} y1={y} x2={x} y2={y - 16} />
                    <Badge x={x} y={y - 16} text={roi.label} fontSize={10} />
                  </>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
