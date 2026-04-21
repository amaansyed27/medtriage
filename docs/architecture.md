# MedTriage — Technical Architecture

## System Overview

MedTriage implements a **cascading LLM → ML → LLM** inference pipeline for emergency-room triage.
The system is designed so that each stage is deterministic and auditable:

1. **LLM extraction** converts unstructured nurse text into structured vitals.
2. **Classical ML prediction** maps vitals to a risk level using a trained Random Forest.
3. **LLM explanation** synthesises a human-readable clinical rationale.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   BROWSER (Next.js 15 / React 19)                                               │
│                                                                                 │
│   1. Nurse types raw intake text into the "Magic Intake" textarea               │
│   2. Clicks "Analyze Patient"                                                   │
│   3. POST /predict  { "raw_text": "..." }  →  FastAPI backend                   │
│   4. Receives JSON response and renders results                                 │
│                                                                                 │
└────────────────────────────┬────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   FASTAPI BACKEND  (Python 3.11+)                                               │
│                                                                                 │
│   ┌───────────────────────────────────────────────────────────────────────────┐  │
│   │  STAGE 1 — Gemini Extractor (Agent 1)                                     │  │
│   │                                                                           │  │
│   │  Input:   raw_text (str)                                                  │  │
│   │  Model:   gemini-2.5-flash                                                │  │
│   │  Mode:    Structured Output (response_mime_type = application/json)        │  │
│   │  Schema:  { age, systolic_bp, diastolic_bp, heart_rate,                   │  │
│   │             o2_saturation, pain_score }                                    │  │
│   │  Output:  PatientVitals (Pydantic model, validated)                       │  │
│   └───────────────────────────────┬───────────────────────────────────────────┘  │
│                                   │                                              │
│                                   ▼                                              │
│   ┌───────────────────────────────────────────────────────────────────────────┐  │
│   │  STAGE 2 — Random Forest Classifier (Scikit-Learn)                        │  │
│   │                                                                           │  │
│   │  Input:   [age, systolic_bp, diastolic_bp, heart_rate,                    │  │
│   │            o2_saturation, pain_score]  (numpy array)                      │  │
│   │  Model:   medtriage_model.pkl  (loaded via joblib at startup)             │  │
│   │  Output:  risk_level ∈ {0, 1, 2}                                         │  │
│   │           0 = Routine  |  1 = Urgent  |  2 = Critical                     │  │
│   └───────────────────────────────┬───────────────────────────────────────────┘  │
│                                   │                                              │
│                                   ▼                                              │
│   ┌───────────────────────────────────────────────────────────────────────────┐  │
│   │  STAGE 3 — Gemini Explainer (Agent 2)                                     │  │
│   │                                                                           │  │
│   │  Input:   vitals dict + risk_level label                                  │  │
│   │  Model:   gemini-2.5-flash                                                │  │
│   │  Mode:    Free-text generation (temperature = 0.3)                        │  │
│   │  Output:  1-sentence clinical rationale (str)                             │  │
│   └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│   RESPONSE  →  { vitals, risk_level, risk_label, rationale }                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Model Training Pipeline

The Random Forest is trained on **2,000 synthetic patient records** generated with
clinically-plausible distributions:

| Feature | Distribution |
|---------|-------------|
| `age` | Uniform 18–95 |
| `systolic_bp` | Normal μ=125, σ=20 |
| `diastolic_bp` | Normal μ=80, σ=12 |
| `heart_rate` | Normal μ=80, σ=15 |
| `o2_saturation` | Truncated Normal μ=96, σ=3 (clamped 70–100) |
| `pain_score` | Uniform 0–10 |

### Risk Label Logic

Labels are assigned deterministically using clinical thresholds:

- **Critical (2)**: systolic ≥ 180 OR diastolic ≥ 120 OR heart_rate ≥ 130 OR o2_sat ≤ 88 OR pain ≥ 9
- **Urgent (1)**: systolic ≥ 150 OR diastolic ≥ 100 OR heart_rate ≥ 110 OR o2_sat ≤ 92 OR pain ≥ 7
- **Routine (0)**: Everything else

---

## Security & Deployment Notes

- The Gemini API key is stored in `backend/.env` and never committed.
- CORS is restricted to `http://localhost:3000` in development.
- The `.pkl` model is git-ignored; it must be regenerated via `train_model.py`.
- For production, add rate-limiting and input sanitisation to the `/predict` endpoint.
