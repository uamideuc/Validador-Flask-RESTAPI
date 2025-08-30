// Type definitions for the application

export enum VariableCategory {
  INSTRUMENT = 'instrument',
  ITEM_ID = 'item_id',
  METADATA = 'metadata',
  CLASSIFICATION = 'classification',
  OTHER = 'other'
}

export interface Variable {
  id: string;
  name: string;
  category: VariableCategory | null;
  sampleValues: string[];
}

export interface VariableCategorization {
  instrument_vars: string[];
  item_id_vars: string[];
  metadata_vars: string[];
  classification_vars: string[];
  other_vars: string[];
}

export interface ValidationSummary {
  total_items: number;
  total_instruments: number;
  validation_status: 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface ValidationReport {
  summary: ValidationSummary;
  duplicateValidation: any; // TODO: Define in later tasks
  metadataValidation: any; // TODO: Define in later tasks
  classificationValidation: any; // TODO: Define in later tasks
  exportOptions: any[]; // TODO: Define in later tasks
}