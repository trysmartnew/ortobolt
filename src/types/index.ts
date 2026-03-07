export interface User { id:string; name:string; email:string; role:'veterinarian'|'resident'|'admin'; specialty:string; crmv:string; avatar?:string; institution:string; certifications:Certification[]; stats:UserStats; preferences:UserPreferences; }
export interface Certification { id:string; title:string; issuer:string; year:number; verified:boolean; }
export interface UserStats { totalCases:number; successRate:number; avgPrecision:number; monthlyProcedures:number; }
export interface UserPreferences { notifications:boolean; theme:'light'|'dark'; language:'pt'|'en'; autoAnalysis:boolean; reportFormat:'pdf'|'docx'; }
export type CaseStatus = 'pending'|'in_analysis'|'completed'|'critical';
export type AnimalSpecies = 'canine'|'feline'|'equine'|'bovine'|'other';
export type ProcedureType = 'TPLO'|'FHO'|'TTA'|'LCP_repair'|'fracture_fixation'|'joint_replacement'|'spinal_surgery'|'other';
export interface ClinicalCase { id:string; title:string; patientName:string; species:AnimalSpecies; breed:string; ageYears:number; weightKg:number; procedure:ProcedureType; status:CaseStatus; precisionScore?:number; riskLevel:'low'|'medium'|'high'; createdAt:string; updatedAt:string; tags:string[]; imageUrl?:string; aiAnalysis?:AIAnalysisResult; notes?:string; veterinarianId:string; }
export interface AIAnalysisResult { id:string; timestamp:string; precisionScore:number; riskFactors:RiskFactor[]; recommendations:string[]; anatomicalLandmarks:AnatomicalLandmark[]; confidence:number; processingTimeMs:number; }
export interface RiskFactor { category:string; description:string; severity:'low'|'medium'|'high'; }
export interface AnatomicalLandmark { name:string; detected:boolean; confidence:number; coordinates?:{x:number;y:number}; }
export interface KPIMetric { id:string; label:string; value:number|string; unit?:string; trend:number; trendDirection:'up'|'down'|'stable'; icon:string; color:string; }
export interface ChartDataPoint { label:string; precision:number; cases:number; success:number; }
export interface ChatMessage { id:string; role:'user'|'assistant'; content:string; timestamp:string; isLoading?:boolean; }
export type NotificationType = 'alert'|'info'|'success'|'warning';
export interface Notification { id:string; type:NotificationType; title:string; message:string; timestamp:string; read:boolean; caseId?:string; }
export interface Report { id:string; title:string; type:'monthly'|'case'|'audit'|'performance'; generatedAt:string; period:string; status:'ready'|'generating'|'error'; sizeKb:number; }
