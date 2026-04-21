<div align="center">

# 🏥 MedTriage

**AI-Powered Emergency Room Triage System**

[![Live Demo](https://img.shields.io/badge/Live_Demo-medtriage--redline.web.app-7BAE7F?style=for-the-badge)](https://medtriage-redline.web.app)

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.6-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_+_Storage-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![GCP](https://img.shields.io/badge/GCP-App_Engine-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*A cascading **LLM → ML → LLM** triage system that reads raw nurse notes and instantly produces risk classification with clinical rationale.*

**Hackovium April 2026**

</div>

---

## Elevator Pitch

> A nurse types messy, unstructured intake notes into a single text box. In under 3 seconds, MedTriage:
>
> 1. **Extracts** 6 structured vitals using Gemini 2.5 Flash
> 2. **Classifies** risk level (Routine / Urgent / Critical) using a Random Forest trained on 2,000 synthetic patients
> 3. **Explains** why in one sentence using a second Gemini agent
>
> No forms. No dropdowns. No structured input. Just natural language in, clinical decision out.

---

## 🚀 How to Use the Live App

1. **Open the App:** Navigate to the live deployment at [https://medtriage-redline.web.app](https://medtriage-redline.web.app).
2. **Sign In:** Click the "Login with Google" button on the landing page to authenticate.
3. **Enter Intake Notes:** In the dashboard, you will see the "Magic Intake" text box. You can type natural language or paste messy, unstructured notes.
4. **Try a Trial Prompt:** Copy and paste the following example into the text box:
   > *72 year old male, BP 182/118, heart rate 134 bpm, O2 sat 86%, pain 9 out of 10. Patient is diaphoretic and short of breath.*
5. **Analyze:** Click "Analyze Patient". The system will instantly extract the vitals, predict the risk level (in this case, Critical), and explain the clinical rationale.

---

## 💡 The Solution & Features

MedTriage replaces traditional, rigid dropdown forms with a single, intelligent text box. By combining two distinct AI modalities, it delivers speed without sacrificing accuracy or explainability.

### Key Features
- **Magic Intake (Raw Text Parsing):** Nurses can type or dictate notes naturally. The Gemini Extractor parses unstructured text into precise, structured JSON vitals.
- **Instant Risk Prediction:** A classical Random Forest model instantly evaluates the extracted vitals and assigns a highly accurate triage risk tier (Routine, Urgent, Critical).
- **Explainable AI (Clinical Rationale):** A secondary Gemini Explainer agent reviews the ML prediction against the vitals to generate a clear, one-sentence clinical rationale, ensuring doctors understand *why* the AI made its decision.
- **Secure Dashboard:** Authenticated environment backed by Firebase Auth (Google Sign-In) with support for simulated patient scan uploads to Firebase Storage.
- **Paper-Minimal UI:** A custom, brutalist-inspired UI designed specifically to reduce cognitive load and eye strain for clinical workers during long shifts.

---

## 🚨 The Problem

| Metric | Value |
|--------|-------|
| Average US ER wait time | **4.5 hours** |
| Triage error rate in high-volume ERs | **~30%** |
| Annual US ER visits | **~150 million** |

Under-triaged patients miss critical intervention windows. Over-triaged patients clog limited resources. The current process is slow, subjective, and error-prone — especially during surges.

---

## Cascading Architecture — Deep Dive

MedTriage uses a novel **3-stage cascading pipeline** that combines the strengths of LLMs (natural language understanding, clinical reasoning) with the speed and determinism of classical ML.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   AGENT 1        │     │   ML MODEL       │     │   AGENT 2        │
│   Gemini 2.5     │────▶│   Random Forest  │────▶│   Gemini 2.5     │
│   Flash          │     │   (100 trees)    │     │   Flash          │
│                  │     │                  │     │                  │
│   Structured     │     │   Risk Level     │     │   Clinical       │
│   JSON Output    │     │   Prediction     │     │   Rationale      │
│   (6 vitals)     │     │   {0, 1, 2}      │     │   (1 sentence)   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        ▲                                                  │
        │                                                  ▼
  Raw Nurse Text                                    Final Response
  "72yo male,                                      {vitals, risk,
   BP 182/118..."                                   rationale}
```

### Stage 1 — Gemini Extractor (Agent 1)

- **Model**: `gemini-2.5-flash` with `temperature: 0.0`
- **Output**: Structured JSON via `response_mime_type: "application/json"` and Pydantic schema enforcement
- **Extracts**: `age`, `systolic_bp`, `diastolic_bp`, `heart_rate`, `o2_saturation`, `pain_score`
- **Fallback**: Clinically neutral defaults for missing vitals (e.g., `age=50`, `o2_saturation=97.0`)

### Stage 2 — Random Forest Predictor

- **Algorithm**: `RandomForestClassifier` (scikit-learn)
- **Configuration**: 100 estimators, max_depth=8, balanced class weights
- **Training**: 2,000 synthetic patients with 12% label noise injection
- **Classes**: `0=Routine`, `1=Urgent`, `2=Critical`
- **Accuracy**: 88.25% (see [Model Card](docs/model_card.md))

### Stage 3 — Gemini Explainer (Agent 2)

- **Model**: `gemini-2.5-flash` with `temperature: 0.3`
- **Output**: Free-text, exactly one sentence
- **Purpose**: Clinical rationale citing specific vital values that drove the prediction
- **Example**: *"Elevated systolic blood pressure of 185 mmHg combined with an O₂ saturation of 86% indicates acute hemodynamic compromise warranting immediate intervention."*

### Why This Architecture?

| Approach | Weakness | MedTriage Solves It |
|----------|----------|---------------------|
| LLM-only classification | Inconsistent, non-deterministic | ML model provides reproducible predictions |
| ML-only pipeline | Requires structured input | LLM extracts structure from messy text |
| Black-box ML | No explanation | Second LLM generates human-readable rationale |

---

## Performance & Metrics

| Metric | Score |
|--------|------:|
| **Accuracy** | 88.25% |
| **Macro F1-Score** | 0.88 |
| **Macro Precision** | 0.89 |
| **Macro Recall** | 0.88 |
| **MAE (ordinal)** | 0.13 |
| **Pseudo R² Score** | 0.67 |

### Per-Class Performance

| Class | Precision | Recall | F1-Score |
|-------|----------:|-------:|---------:|
| Routine (0) | 0.87 | 0.95 | 0.91 |
| Urgent (1) | 0.89 | 0.80 | 0.84 |
| Critical (2) | 0.91 | 0.90 | 0.91 |

### Feature Importance

| Rank | Feature | Importance |
|-----:|---------|----------:|
| 1 | pain_score | 0.6679 |
| 2 | o2_saturation | 0.0968 |
| 3 | systolic_bp | 0.0886 |
| 4 | diastolic_bp | 0.0645 |
| 5 | heart_rate | 0.0464 |
| 6 | age | 0.0358 |

> **Note**: 12% label noise is intentionally injected during training to simulate real-world annotation disagreement between clinicians. See [Model Card](docs/model_card.md) for details.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS v4 | Paper-minimal dashboard & landing page |
| **Auth** | Firebase Authentication (Google Sign-In) | User login gating |
| **Storage** | Firebase Cloud Storage | Patient scan uploads |
| **Backend** | FastAPI, Python 3.12 | Cascading inference API |
| **ML** | Scikit-Learn, Pandas, NumPy, joblib | Random Forest training & export |
| **LLM** | Google Gemini 2.5 Flash (`google-genai`) | Extraction + Explanation agents |
| **Hosting (FE)** | Firebase Hosting | Next.js deployment |
| **Hosting (BE)** | Google Cloud App Engine | FastAPI deployment |

---

## Project Structure

```
hackovium-april-2026/
├── agents.md                  # AI agent definitions (Extractor + Explainer)
├── rules.md                   # Design system & coding standards
├── requirements.txt           # Python dependencies
│
├── ml/
│   ├── train_model.py         # Synthetic data gen + RF training + report
│   ├── synthetic_patients.csv # Generated dataset (2,000 records)
│   ├── medtriage_model.pkl    # Exported model artifact
│   └── training_report.md     # Auto-generated evaluation report
│
├── backend/
│   ├── main.py                # FastAPI cascading inference pipeline
│   ├── app.yaml               # GCP App Engine configuration
│   └── .env                   # GEMINI_API_KEY (not committed)
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with metadata
│   │   ├── globals.css        # Paper-minimal design system
│   │   ├── page.tsx           # Landing page with Firebase Auth
│   │   └── dashboard/
│   │       └── page.tsx       # Triage dashboard (auth-gated)
│   ├── lib/
│   │   └── firebase.ts        # Firebase init (Auth + Storage)
│   ├── firebase.json          # Firebase Hosting config
│   ├── .firebaserc            # Firebase project alias
│   ├── storage.rules          # Firebase Storage security rules
│   └── package.json           # Node dependencies
│
├── docs/
│   ├── architecture.md        # Detailed architecture documentation
│   └── model_card.md          # ML Model Card (RFC format)
│
└── deploy_commands.sh         # Full GCP + Firebase deploy script
```

---

## Quick Start (Local Development)

### Prerequisites

- Python 3.12+
- Node.js 20+
- A [Google Gemini API Key](https://aistudio.google.com/apikey)

### 1. Train the ML Model

```bash
cd ml
pip install -r ../requirements.txt
python train_model.py
```

This generates `synthetic_patients.csv`, `medtriage_model.pkl`, and `training_report.md`.

### 2. Start the Backend

```bash
cd backend
echo "GEMINI_API_KEY=your_key_here" > .env
uvicorn main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`. Test with:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"raw_text": "45 year old female, BP 160/105, HR 115, O2 91%, pain 8/10"}'
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### 4. Firebase Setup (Optional for Local)

Create a `frontend/.env.local` with your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deployment

### Backend → Google Cloud App Engine

```bash
cd backend
gcloud app deploy app.yaml --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY
```

### Frontend → Firebase Hosting

```bash
cd frontend
firebase deploy --only hosting
```

See [`deploy_commands.sh`](deploy_commands.sh) for the full sequential deployment script including project creation, Firebase setup, and secret injection.

---

## API Reference

### `POST /predict`

**Request:**
```json
{
  "raw_text": "72yo male, BP 182/118, HR 134, O2 86%, pain 9/10"
}
```

**Response:**
```json
{
  "vitals": {
    "age": 72,
    "systolic_bp": 182,
    "diastolic_bp": 118,
    "heart_rate": 134,
    "o2_saturation": 86.0,
    "pain_score": 9
  },
  "risk_level": 2,
  "risk_label": "Critical",
  "rationale": "Elevated systolic blood pressure of 182 mmHg combined with an O₂ saturation of 86% indicates acute hemodynamic compromise warranting immediate intervention."
}
```

### `GET /health`

Returns `{"status": "healthy", "service": "medtriage"}`.

---

## Design Philosophy

MedTriage uses a **Paper-Minimal** aesthetic designed to reduce cognitive fatigue for clinical users:

- **Background**: `#FAF8F5` (warm parchment)
- **Text**: `#1A1A1A` (soft ink)
- **Accent**: `#7BAE7F` (matcha green — used sparingly)
- **Cards**: Glassmorphism with subtle backdrop blur
- **Typography**: Georgia serif for readability, monospace for data
- **Animations**: Fade-in, slide-up, pulse — minimal, purposeful

---

## License

MIT © Hackovium 2026

---

<div align="center">
  <sub>Built with urgency for Hackovium April 2026 🏥</sub>
</div>
