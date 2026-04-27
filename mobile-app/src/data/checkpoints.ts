import { PhotoCheckpoint, StepDef, StructuralCheckpoint, StructuralCheckState } from '../types';

export const STEPS: StepDef[] = [
  { id: 'intro', title: 'Intro' },
  { id: 'details', title: 'Car Details' },
  { id: 'photos', title: 'Photos' },
  { id: 'structural', title: 'Structural Check' },
  { id: 'noise', title: 'Engine Noise' },
  { id: 'report', title: 'Final Report' },
];

export const PHOTO_CHECKPOINTS: PhotoCheckpoint[] = [
  { id: 'front', label: 'Front View', hint: 'Bumper, grille, hood alignment' },
  { id: 'rear', label: 'Rear View', hint: 'Boot gap, lights, bumper line' },
  { id: 'left', label: 'Left Side', hint: 'Door lines, repaint, dents' },
  { id: 'right', label: 'Right Side', hint: 'Panel gaps and scratches' },
  { id: 'engine', label: 'Engine Bay', hint: 'Leaks, hoses, weld marks' },
  { id: 'tyres', label: 'Tyres Close-up', hint: 'Wear pattern and sidewall' },
];

export const STRUCTURAL_CHECKPOINTS: StructuralCheckpoint[] = [
  {
    id: 'pillars',
    title: 'A/B/C Pillars',
    description: 'Check repaint mismatch, filler waves, seam sealer breaks, and overspray near rubber beading.',
  },
  {
    id: 'roof',
    title: 'Roof Rails + Edges',
    description: 'Uneven roof channels or weld marks can indicate rollover repair.',
  },
  {
    id: 'panel-gaps',
    title: 'Door / Bonnet / Boot Gaps',
    description: 'Left-right gap mismatch is a common signal of previous impact repair.',
  },
  {
    id: 'engine-welds',
    title: 'Engine Bay Weld Points',
    description: 'Factory welds are uniform. Rough or non-uniform welds suggest structure work.',
  },
  {
    id: 'chassis',
    title: 'Chassis / Apron / Strut Towers',
    description: 'Look for ripples, hammer marks, fresh paint patches, or non-factory sealant.',
  },
  {
    id: 'boot-floor',
    title: 'Boot Floor + Spare Wheel Well',
    description: 'Wrinkles and cut-join marks can indicate rear impact repair.',
  },
  {
    id: 'lights-date',
    title: 'Headlight / Tail-light Date Match',
    description: 'One side newer than the other can indicate side-specific replacement after collision.',
  },
  {
    id: 'glass-dates',
    title: 'All Glass Date Codes',
    description: 'Multiple windows with different dates can indicate accident-related replacements.',
  },
  {
    id: 'bolt-tampering',
    title: 'Bolt Tampering (Hinges/Fenders)',
    description: 'Tool marks on bolts suggest panel removal or replacement.',
  },
  {
    id: 'alignment',
    title: 'Tyre Wear + Steering Alignment',
    description: 'Uneven wear or steering pull can indicate chassis alignment issues.',
  },
];

export const createInitialPhotoState = (): Record<string, boolean> =>
  Object.fromEntries(PHOTO_CHECKPOINTS.map((item) => [item.id, false]));

export const createInitialStructuralState = (): Record<string, StructuralCheckState> =>
  Object.fromEntries(
    STRUCTURAL_CHECKPOINTS.map((item) => [
      item.id,
      {
        reviewed: false,
        flagged: false,
      },
    ])
  );
