export type ExportScope =
  | 'readiness_distribution'
  | 'engagement_metrics'
  | 'improvement_trends'
  | 'college_intent'
  | 'trajectory'
  | 'senior_risk'
  | 'counseling_capacity';
 
export type ExportFormat = 'csv';
 
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';




