export type StepId = 'intro' | 'details' | 'photos' | 'structural' | 'noise' | 'report';

export interface StepDef {
  id: StepId;
  title: string;
}

export interface CarDetails {
  carName: string;
  registrationNumber: string;
  askingPrice: string;
  odometer: string;
}

export interface PhotoCheckpoint {
  id: string;
  label: string;
  hint: string;
}

export interface StructuralCheckpoint {
  id: string;
  title: string;
  description: string;
}

export interface StructuralCheckState {
  reviewed: boolean;
  flagged: boolean;
}

export interface CapturedPhoto {
  uri: string;
  base64: string;
  name: string;
  type: string;
  label: string;
}

export interface AudioClip {
  uri: string;
  name: string;
  type: string;
}

export type NoiseState = 'idle' | 'recording' | 'recorded';

export type Severity = 'low' | 'medium' | 'high';

export type Decision = 'buy' | 'negotiate' | 'avoid';

export interface VehicleData {
  registrationNumber: string;
  ownerName: string;
  makerModel: string;
  fuelType: string;
  vehicleClass: string;
  chassisNumber: string;
  engineNumber: string;
  registrationDate: string;
  fitnessUpto: string;
  insuranceExpiry: string;
  colour: string;
  state: string;
  yearOfManufacture: string;
  blacklistStatus: string;
  financeBank: string;
  noc: string;
  _provider?: string;
  _mode?: string;
}

// Matches Claude photo_analysis_result schema
export interface PhotoFinding {
  area: string;
  severity: Severity;
  description: string;
  recommendation: string;
}

export interface PhotoAnalysisResult {
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  risk_level: Severity;
  summary: string;
  findings: PhotoFinding[];
  red_flags: string[];
  positive_points: string[];
}

// Matches Claude audio_analysis_result schema
export interface AudioAnalysisResult {
  risk_level: Severity;
  summary: string;
  detected_sounds: string[];
  possible_causes: string[];
  recommended_checks: string[];
  negotiation_impact: string;
}

// Matches Claude inspection_report schema
export interface KeyFinding {
  category: string;
  severity: Severity;
  detail: string;
}

export interface RepairEstimate {
  item: string;
  min_inr: number;
  max_inr: number;
}

export interface NegotiationStrategy {
  suggested_offer_inr: number;
  talking_points: string[];
}

export interface VehicleSummary {
  make_model: string;
  registration: string;
  asking_price: string;
  odometer: string;
  owner_name: string;
  fuel_type: string;
  year: string;
}

export interface FinalReport {
  decision: Decision;
  score: number;
  summary: string;
  vehicle_summary: VehicleSummary;
  red_flags: string[];
  key_findings: KeyFinding[];
  repair_estimates: RepairEstimate[];
  negotiation_strategy: NegotiationStrategy;
  next_steps: string[];
}
