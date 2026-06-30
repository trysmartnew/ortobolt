import { Point } from '../types/markings';
import { NORBERG_THRESHOLDS, TPA_THRESHOLDS } from '../constants/markingThresholds';

/** 
 * Calcula o ângulo (em graus) entre três pontos, com o vertex como ponto central.
 * Ex: calculateAngle({x:0, y:1}, {x:0, y:0}, {x:1, y:0}) => 90
 */
export function calculateAngle(p1: Point, vertex: Point, p2: Point): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  
  const angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
  let degrees = angle * (180 / Math.PI);
  
  if (degrees < 0) degrees += 360;
  return degrees > 180 ? 360 - degrees : degrees;
}

/** 
 * Calcula a distância euclidiana entre dois pontos.
 * Ex: calculateDistance({x:0, y:0}, {x:3, y:4}) => 5
 */
export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/** 
 * Classifica o ângulo de Norberg: >105° normal, 100-105° mild, 90-100° moderate, <90° severe.
 * Ex: classifyNorberg(110) => 'normal'
 */
export function classifyNorberg(angle: number): 'normal' | 'mild' | 'moderate' | 'severe' {
  if (angle > NORBERG_THRESHOLDS.NORMAL) return 'normal';
  if (angle >= NORBERG_THRESHOLDS.MILD) return 'mild';
  if (angle >= NORBERG_THRESHOLDS.MODERATE) return 'moderate';
  return 'severe';
}

/** 
 * Classifica o TPA (Tibial Plateau Angle): <22° normal, >=22° elevated para cães.
 * Ex: classifyTPA(20) => 'normal'
 */
export function classifyTPA(angle: number): 'normal' | 'elevated' {
  return angle < TPA_THRESHOLDS.ELEVATED ? 'normal' : 'elevated';
}
