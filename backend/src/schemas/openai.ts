export const photoAnalysisSchema = {
  name: 'photo_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'risk_level', 'findings'],
    properties: {
      summary: { type: 'string' },
      risk_level: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'issue', 'severity', 'evidence', 'recommendation'],
          properties: {
            label: { type: 'string' },
            issue: { type: 'string' },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            evidence: { type: 'string' },
            recommendation: { type: 'string' },
          },
        },
      },
    },
  },
};

export const audioAnalysisSchema = {
  name: 'audio_analysis',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'risk_level', 'likely_causes', 'next_checks'],
    properties: {
      summary: { type: 'string' },
      risk_level: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      likely_causes: { type: 'array', items: { type: 'string' } },
      next_checks: { type: 'array', items: { type: 'string' } },
    },
  },
};

export const inspectionReportSchema = {
  name: 'inspection_report',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'vehicle_summary',
      'overall_score',
      'decision',
      'confidence',
      'red_flags',
      'inspection_findings',
      'repair_estimates_inr',
      'negotiation_strategy',
      'next_steps',
    ],
    properties: {
      vehicle_summary: {
        type: 'object',
        additionalProperties: false,
        required: ['registration', 'make_model', 'fuel_type', 'registration_status'],
        properties: {
          registration: { type: 'string' },
          make_model: { type: 'string' },
          fuel_type: { type: 'string' },
          registration_status: { type: 'string' },
        },
      },
      overall_score: { type: 'integer', minimum: 0, maximum: 100 },
      decision: { type: 'string', enum: ['BUY', 'NEGOTIATE', 'AVOID'] },
      confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      red_flags: { type: 'array', items: { type: 'string' } },
      inspection_findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['category', 'severity', 'evidence', 'recommendation'],
          properties: {
            category: { type: 'string' },
            severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            evidence: { type: 'string' },
            recommendation: { type: 'string' },
          },
        },
      },
      repair_estimates_inr: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['item', 'min', 'max'],
          properties: {
            item: { type: 'string' },
            min: { type: 'integer', minimum: 0 },
            max: { type: 'integer', minimum: 0 },
          },
        },
      },
      negotiation_strategy: {
        type: 'object',
        additionalProperties: false,
        required: ['target_discount_min', 'target_discount_max', 'talking_points'],
        properties: {
          target_discount_min: { type: 'integer', minimum: 0 },
          target_discount_max: { type: 'integer', minimum: 0 },
          talking_points: { type: 'array', items: { type: 'string' } },
        },
      },
      next_steps: { type: 'array', items: { type: 'string' } },
    },
  },
};
