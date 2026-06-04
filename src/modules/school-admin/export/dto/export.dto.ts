import {  ExportScope, ExportFormat } from '../types/export.types';
 
export interface TriggerExportDto {
  scope:   ExportScope;
  format:  ExportFormat;
  filters: {
    grade_levels?: number[];
    term?:         string;
    [key: string]: unknown;
  };
}




