export interface Point {
  x: number;
  y: number;
}

export interface AlignmentCircle {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  label?: string;
  stage?: string;
}

export interface AngleMeasurement {
  id: string;
  points: [Point, Point, Point];
  value: number;
  type: 'TPA' | 'Norberg';
}

export interface FractureMarker {
  id: string;
  x: number;
  y: number;
  label?: string;
  type?: string;
}

export interface ROI {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  severity?: string;
}

export interface MarkingsData {
  circles: AlignmentCircle[];
  angles: AngleMeasurement[];
  markers: FractureMarker[];
  rois: ROI[];
}

export type MarkingTool = 'circle' | 'angle-tpa' | 'angle-norberg' | 'marker' | 'roi' | 'select' | null;
