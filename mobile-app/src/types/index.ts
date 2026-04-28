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

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

export type Decision = 'BUY' | 'NEGOTIATE' | 'AVOID';

export interface VehicleData {
  registrationNumber: string;
  ownerName: string;
  makerModel: string;
  fuelType: string;
  registrationStatus: string;
  insuranceValidTill: string;
  registeredAt: string;
  _provider?: string;
  _mode?: string;
}

export interface PhotoFinding {
  label: string;
  issue: string;
  severity: Severity;
  evidence: string;
  recommendation: string;
}

export interface PhotoAnalysisResult {
  summary: string;
  risk_level: Severity;
  findings: PhotoFinding[];
}

export interface AudioAnalysisResult {
  summary: string;
  risk_level: Severity;
  likely_causes: string[];
  next_checks: string[];
}

export interface InspectionFinding {
  category: string;
  severity: Severity;
  evidence: string;
  recommendation: string;
}

export interface RepairEstimate {
  item: string;
  min: number;
  max: number;
}

export interface NegotiationStrategy {
  target_discount_min: number;
  target_discount_max: number;
  talking_points: string[];
}

export interface VehicleSummary {
  registration: string;
  make_model: string;
  fuel_type: string;
  registration_status: string;
}

export interface FinalReport {
  vehicle_summary: VehicleSummary;
  overall_score: number;
  decision: Decision;
  confidence: Severity;
  red_flags: string[];
  inspection_findings: InspectionFinding[];
  repair_estimates_inr: RepairEstimate[];
  negotiation_strategy: NegotiationStrategy;
  next_steps: string[];
}
