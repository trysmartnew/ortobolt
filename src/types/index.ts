// ── Core User & Auth ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'professional';
  specialty: string;
  crmv: string;
  crmv_state?: string;
  crmv_verified?: boolean;
  academic_disclaimer_accepted?: boolean;
  avatar?: string;
  institution: string;
  certifications: Certification[];
  stats: UserStats;
  preferences: UserPreferences;
}

export type UserRole = 'professional';
export type Plan = 'free' | 'professional' | 'enterprise';
export interface Certification { id:string; title:string; issuer:string; year:number; verified:boolean; }
export interface UserStats { totalCases:number; successRate:number; avgPrecision:number; monthlyProcedures:number; }
export interface UserPreferences { notifications:boolean; theme:'light'|'dark'; language:'pt'|'en'; autoAnalysis:boolean; reportFormat:'pdf'|'docx'; }

// ── Clinical Case ─────────────────────────────────────────────────────────────
export type CaseStatus = 'pending'|'in_analysis'|'completed'|'critical';
export type AnimalSpecies = 'canine'|'feline'|'equine'|'bovine'|'other';
export type ProcedureType = 'TPLO'|'FHO'|'TTA'|'LCP_repair'|'fracture_fixation'|'joint_replacement'|'spinal_surgery'|'other';
export type ExamModality = 'radiograph'|'clinical_photo'|'comparative_study'|'multimodal';
export interface CaseExam { id:string; modality:ExamModality; imageUrls:string[]; aiAnalysis?:AIAnalysisResult; analysisText?:string; markings?:import('@/types/markings').MarkingsData; createdAt:string; markedAt?:string; markedBy?:string; }
export interface ClinicalCase { id:string; title:string; patientName:string; species:AnimalSpecies; breed:string; ageYears:number; weightKg:number; procedure:ProcedureType; status:CaseStatus; precisionScore?:number; riskLevel:'low'|'medium'|'high'; createdAt:string; updatedAt:string; tags:string[]; imageUrl?:string; image_path?: string; aiAnalysis?:AIAnalysisResult; notes?:string; avatarUrl?:string; avatar_path?: string; veterinarianId:string; clinicalEvidence?:import('@/schemas/clinicalEvidence').ClinicalEvidence; exams?:CaseExam[]; }
export interface AIAnalysisResult { id:string; timestamp:string; precisionScore:number; riskFactors:RiskFactor[]; recommendations:string[]; anatomicalLandmarks:AnatomicalLandmark[]; confidence:number; processingTimeMs:number; }
export interface RiskFactor { category:string; description:string; severity:'low'|'medium'|'high'; }
export interface AnatomicalLandmark { name:string; detected:boolean; confidence:number; coordinates?:{x:number;y:number}; }

// ── KPIs / Charts ─────────────────────────────────────────────────────────────
export interface KPIMetric { id:string; label:string; value:number|string; unit?:string; trend:number; trendDirection:'up'|'down'|'stable'; icon:string; color:string; }
export interface ChartDataPoint { label:string; precision:number; cases:number; success:number; }

// ── AI Chat ───────────────────────────────────────────────────────────────────
export interface ChatMessage { id:string; role:'user'|'assistant'; content:string; timestamp:string; isLoading?:boolean; }

// ── Notifications ─────────────────────────────────────────────────────────────
export type NotificationType = 'alert'|'info'|'success'|'warning';
export interface Notification { id:string; type:NotificationType; title:string; message:string; timestamp:string; read:boolean; caseId?:string; }

// ── Reports ───────────────────────────────────────────────────────────────────
export interface Report { id:string; title:string; type:'monthly'|'case'|'audit'|'performance'; generatedAt:string; period:string; status:'ready'|'generating'|'error'; sizeKb:number; }


