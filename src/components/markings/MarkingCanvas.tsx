import { useState } from 'react';
import { Stage, Layer, Image, Circle, Line, Rect, Text, Group } from 'react-konva';
import type { MarkingsData, MarkingTool, AlignmentCircle, AngleMeasurement, FractureMarker, ROI, Point } from '../../types/markings';
import { calculateAngle, classifyNorberg, classifyTPA } from '../../utils/geometry';

interface MarkingCanvasProps {
  image: HTMLImageElement | null;
  width: number;
  height: number;
  markings: MarkingsData;
  activeTool: MarkingTool | null;
  onAddCircle: (circle: AlignmentCircle) => void;
  onAddAngle: (angle: AngleMeasurement) => void;
  onAddMarker: (marker: FractureMarker) => void;
  onAddROI: (roi: ROI) => void;
  onUpdateMarking: (id: string, updates: any) => void;
}

export function MarkingCanvas({ image, width, height, markings, activeTool, onAddCircle, onAddAngle, onAddMarker, onAddROI }: MarkingCanvasProps) {
  const [pendingPoints, setPendingPoints] = useState<Point[]>([]);

  return (
    <Stage 
      width={width} 
      height={height} 
      onClick={(e) => {
        if (!activeTool || activeTool === 'select') return;
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos) return;
        
        const id = crypto.randomUUID();
        
        if (activeTool === 'circle') {
          onAddCircle({ id, cx: pos.x, cy: pos.y, radius: 30, label: 'Círculo', stage: 'pre' });
        } else if (activeTool === 'marker') {
          onAddMarker({ id, x: pos.x, y: pos.y, type: 'point', label: 'Marker' });
        } else if (activeTool === 'roi') {
          onAddROI({ id, x: pos.x, y: pos.y, width: 50, height: 50, label: 'ROI', severity: 'medium' });
        } else if (activeTool.startsWith('angle-')) {
          const newPoints = [...pendingPoints, pos];
          if (newPoints.length === 3) {
            const angleVal = calculateAngle(newPoints[0], newPoints[1], newPoints[2]);
            onAddAngle({
              id, 
              points: newPoints as [Point, Point, Point],
              value: angleVal, 
              type: activeTool === 'angle-tpa' ? 'TPA' : 'Norberg' 
            });
            setPendingPoints([]);
          } else {
            setPendingPoints(newPoints);
          }
        }
      }}
    >
      <Layer>
        {image && <Image image={image} width={width} height={height} listening={false} />}
      </Layer>
      <Layer>
        {markings.circles.map((c: AlignmentCircle) => (
          <Group key={c.id}>
            <Circle x={c.cx} y={c.cy} radius={c.radius} stroke="cyan" strokeWidth={2} fill="rgba(0,255,255,0.1)" />
            {c.label && <Text x={c.cx} y={c.cy - c.radius - 15} text={c.label} fill="cyan" fontSize={12} />}
          </Group>
        ))}
        {markings.angles.map((a: AngleMeasurement) => {
          const classification = a.type === 'TPA' ? classifyTPA(a.value ?? 0) : classifyNorberg(a.value ?? 0);
          const color = (classification === 'severe' || classification === 'elevated') ? 'red' : 'yellow';
          return (
            <Group key={a.id}>
              <Line points={[a.points[0].x, a.points[0].y, a.points[1].x, a.points[1].y, a.points[2].x, a.points[2].y]} stroke={color} strokeWidth={2} />
              {a.value !== null && <Text x={a.points[1].x} y={a.points[1].y - 15} text={`${a.value.toFixed(1)}°`} fill={color} fontSize={14} />}
            </Group>
          );
        })}
        {markings.markers.map((m: FractureMarker) => (
          <Group key={m.id}>
            <Circle x={m.x} y={m.y} radius={5} fill="red" />
            {m.label && <Text x={m.x + 8} y={m.y - 5} text={m.label} fill="red" fontSize={12} />}
          </Group>
        ))}
        {markings.rois.map((r: ROI) => (
          <Rect key={r.id} x={r.x} y={r.y} width={r.width} height={r.height} stroke="green" strokeWidth={2} />
        ))}
      </Layer>
    </Stage>
  );
}
