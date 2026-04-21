<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15+-000?style=flat-square&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_API-google--genai-4285F4?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--Learn-RF-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" />
</p>

# MedTriage

> **Cascading LLM → ML → LLM emergency-room triage.**  
> A nurse types raw, unstructured patient vitals into a single text box.  
> MedTriage extracts the vitals, predicts risk with classical ML, and writes a clinical rationale — all in one request.

---

## Architecture

```
┌──────────────┐    POST /predict     ┌──────────────────────────────────────────────┐
│  Next.js UI  │ ──────────────────►  │                 FastAPI                       │
│  (Tailwind)  │                      │                                              │
│              │ ◄──────────────────  │  ┌────────────┐  ┌──────────┐  ┌──────────┐  │
│  Dashboard   │   JSON response      │  │ Gemini     │  │ RF Model │  │ Gemini   │  │
└──────────────┘                      │  │ Extractor  │─►│ .predict │─►│ Explainer│  │
                                      │  │ (Agent 1)  │  │ (sklearn)│  │ (Agent 2)│  │
                                      │  └────────────┘  └──────────┘  └──────────┘  │
                                      └──────────────────────────────────────────────┘
```

### The Three Stages

| Stage | Engine | Purpose |
|-------|--------|---------|
| **1. Extract** | Gemini `gemini-2.5-flash` | Parse raw nurse text → structured JSON of 6 vitals |
| **2. Predict** | Scikit-Learn Random Forest | Classify risk level: `0` (Routine), `1` (Urgent), `2` (Critical) |
| **3. Explain** | Gemini `gemini-2.5-flash` | Generate 1-sentence clinical rationale from vitals + prediction |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (`GEMINI_API_KEY`)

### 1. Train the ML Model

```bash
cd ml
pip install -r ../requirements.txt
python train_model.py
# Outputs: ml/medtriage_model.pkl
```

### 2. Start the Backend

```bash
cd backend
# Create a .env file with your API key
echo GEMINI_API_KEY=your_key_here > .env
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Opens http://localhost:3000
```

---

## Project Structure

```
hackovium-april-2026/
├── .gitignore
├── README.md
├── requirements.txt
├── agents.md
├── rules.md
├── docs/
│   └── architecture.md
├── ml/
│   └── train_model.py          # Synthetic data + RF training
├── backend/
│   ├── .env                    # GEMINI_API_KEY (git-ignored)
│   └── main.py                 # FastAPI: Extract → Predict → Explain
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── postcss.config.mjs
    └── app/
        ├── layout.tsx
        ├── globals.css
        └── page.tsx            # Paper-minimal triage dashboard
```

---

## License

Built for **Hackovium April 2026** 🏥
