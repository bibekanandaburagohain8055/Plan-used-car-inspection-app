PHOTO_ANALYSIS_SCHEMA = {
    "name": "photo_analysis_result",
    "description": "Structured analysis of used car inspection photos",
    "input_schema": {
        "type": "object",
        "properties": {
            "overall_condition": {
                "type": "string",
                "enum": ["excellent", "good", "fair", "poor"],
            },
            "risk_level": {"type": "string", "enum": ["low", "medium", "high"]},
            "summary": {"type": "string"},
            "findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "area": {"type": "string"},
                        "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                        "description": {"type": "string"},
                        "recommendation": {"type": "string"},
                    },
                    "required": ["area", "severity", "description", "recommendation"],
                },
            },
            "red_flags": {"type": "array", "items": {"type": "string"}},
            "positive_points": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "overall_condition",
            "risk_level",
            "summary",
            "findings",
            "red_flags",
            "positive_points",
        ],
    },
}

AUDIO_ANALYSIS_SCHEMA = {
    "name": "audio_analysis_result",
    "description": "Structured analysis of engine audio recording",
    "input_schema": {
        "type": "object",
        "properties": {
            "risk_level": {"type": "string", "enum": ["low", "medium", "high"]},
            "summary": {"type": "string"},
            "detected_sounds": {"type": "array", "items": {"type": "string"}},
            "possible_causes": {"type": "array", "items": {"type": "string"}},
            "recommended_checks": {"type": "array", "items": {"type": "string"}},
            "negotiation_impact": {"type": "string"},
        },
        "required": [
            "risk_level",
            "summary",
            "detected_sounds",
            "possible_causes",
            "recommended_checks",
            "negotiation_impact",
        ],
    },
}

REPORT_SCHEMA = {
    "name": "inspection_report",
    "description": "Final structured buying decision report for a used car",
    "input_schema": {
        "type": "object",
        "properties": {
            "decision": {"type": "string", "enum": ["buy", "negotiate", "avoid"]},
            "score": {"type": "integer", "minimum": 0, "maximum": 100},
            "summary": {"type": "string"},
            "vehicle_summary": {
                "type": "object",
                "properties": {
                    "make_model": {"type": "string"},
                    "registration": {"type": "string"},
                    "asking_price": {"type": "string"},
                    "odometer": {"type": "string"},
                    "owner_name": {"type": "string"},
                    "fuel_type": {"type": "string"},
                    "year": {"type": "string"},
                },
                "required": [
                    "make_model",
                    "registration",
                    "asking_price",
                    "odometer",
                    "owner_name",
                    "fuel_type",
                    "year",
                ],
            },
            "red_flags": {"type": "array", "items": {"type": "string"}},
            "key_findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string"},
                        "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                        "detail": {"type": "string"},
                    },
                    "required": ["category", "severity", "detail"],
                },
            },
            "repair_estimates": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "item": {"type": "string"},
                        "min_inr": {"type": "integer"},
                        "max_inr": {"type": "integer"},
                    },
                    "required": ["item", "min_inr", "max_inr"],
                },
            },
            "negotiation_strategy": {
                "type": "object",
                "properties": {
                    "suggested_offer_inr": {"type": "integer"},
                    "talking_points": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["suggested_offer_inr", "talking_points"],
            },
            "next_steps": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "decision",
            "score",
            "summary",
            "vehicle_summary",
            "red_flags",
            "key_findings",
            "repair_estimates",
            "negotiation_strategy",
            "next_steps",
        ],
    },
}
