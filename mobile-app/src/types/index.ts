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
