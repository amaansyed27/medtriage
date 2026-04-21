"""
MedTriage — FastAPI Backend

Implements the cascading LLM → ML → LLM inference pipeline:
  1. Gemini Extractor (Agent 1): raw nurse text → structured vitals JSON
  2. Random Forest (Scikit-Learn): vitals → risk_level {0, 1, 2}
  3. Gemini Explainer (Agent 2): vitals + risk → 1-sentence clinical rationale

Run:
    cd backend
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel, Field

# ────────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────────

load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = "gemini-2.5-flash"
MODEL_PKL_PATH: Path = Path(__file__).parent.parent / "ml" / "medtriage_model.pkl"

FEATURE_ORDER: list[str] = [
    "age",
    "systolic_bp",
    "diastolic_bp",
    "heart_rate",
    "o2_saturation",
    "pain_score",
]

RISK_LABELS: dict[int, str] = {
    0: "Routine",
    1: "Urgent",
    2: "Critical",
}

logger = logging.getLogger("medtriage")
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(name)s  %(levelname)s  %(message)s")


# ────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ────────────────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    raw_text: str = Field(min_length=10, description="Raw nurse intake text describing patient vitals")


class PatientVitals(BaseModel):
    age: int = Field(description="Patient age in years")
    systolic_bp: int = Field(description="Systolic blood pressure in mmHg")
    diastolic_bp: int = Field(description="Diastolic blood pressure in mmHg")
    heart_rate: int = Field(description="Heart rate in beats per minute")
    o2_saturation: float = Field(description="Oxygen saturation percentage")
    pain_score: int = Field(description="Pain score on 0-10 scale")


class PredictResponse(BaseModel):
    vitals: PatientVitals
    risk_level: int
    risk_label: str
    rationale: str


class ErrorResponse(BaseModel):
    detail: str


# ────────────────────────────────────────────────────────────────────────────
# Application State (loaded once at startup)
# ────────────────────────────────────────────────────────────────────────────

class AppState:
    ml_model: Any = None
    gemini_client: genai.Client | None = None


state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model and initialise Gemini client at startup."""
    # Load the Random Forest model
    if not MODEL_PKL_PATH.exists():
        logger.error(f"Model file not found at {MODEL_PKL_PATH}. Run ml/train_model.py first.")
        raise FileNotFoundError(f"Model file not found at {MODEL_PKL_PATH}")

    state.ml_model = joblib.load(MODEL_PKL_PATH)
    logger.info(f"Loaded ML model from {MODEL_PKL_PATH}")

    # Initialise Gemini client
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not set in environment or .env file.")
        raise ValueError("GEMINI_API_KEY is required")

    state.gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    logger.info("Gemini client initialised")

    yield

    logger.info("Shutting down MedTriage backend")


# ────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MedTriage API",
    description="Cascading LLM → ML → LLM emergency-room triage system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────────────────────────────────────
# Agent 1: Gemini Extractor
# ────────────────────────────────────────────────────────────────────────────

EXTRACTOR_SYSTEM_PROMPT: str = """You are a clinical data extraction assistant working in a hospital emergency room.

Given raw intake text from a triage nurse, extract EXACTLY these six numeric vitals:
- age (integer, years)
- systolic_bp (integer, mmHg)
- diastolic_bp (integer, mmHg)
- heart_rate (integer, bpm)
- o2_saturation (float, percentage)
- pain_score (integer, 0-10 scale)

Rules:
1. Extract ONLY numeric values. Never invent or hallucinate data.
2. If a vital is genuinely missing from the text, use a clinically neutral default:
   age=50, systolic_bp=120, diastolic_bp=80, heart_rate=75, o2_saturation=97.0, pain_score=3
3. Return ONLY the JSON object, no commentary."""


def extract_vitals(raw_text: str) -> PatientVitals:
    """Use Gemini (Agent 1) to extract structured vitals from raw nurse text."""
    if state.gemini_client is None:
        raise RuntimeError("Gemini client not initialised")

    response = state.gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=f"Extract the patient vitals from this nurse intake note:\n\n{raw_text}",
        config={
            "system_instruction": EXTRACTOR_SYSTEM_PROMPT,
            "response_mime_type": "application/json",
            "response_json_schema": PatientVitals.model_json_schema(),
            "temperature": 0.0,
        },
    )

    raw_json = response.text
    logger.info(f"Extractor raw output: {raw_json}")

    vitals = PatientVitals.model_validate_json(raw_json)
    return vitals


# ────────────────────────────────────────────────────────────────────────────
# Stage 2: ML Prediction
# ────────────────────────────────────────────────────────────────────────────

def predict_risk(vitals: PatientVitals) -> int:
    """Run the Random Forest model on the extracted vitals."""
    if state.ml_model is None:
        raise RuntimeError("ML model not loaded")

    feature_values = [
        vitals.age,
        vitals.systolic_bp,
        vitals.diastolic_bp,
        vitals.heart_rate,
        vitals.o2_saturation,
        vitals.pain_score,
    ]

    X = np.array([feature_values])
    prediction: int = int(state.ml_model.predict(X)[0])
    logger.info(f"ML prediction: {prediction} ({RISK_LABELS.get(prediction, 'Unknown')})")
    return prediction


# ────────────────────────────────────────────────────────────────────────────
# Agent 2: Gemini Explainer
# ────────────────────────────────────────────────────────────────────────────

EXPLAINER_SYSTEM_PROMPT: str = """You are a senior emergency medicine physician assistant.

Given a patient's extracted vitals and a machine-learning triage prediction,
write EXACTLY ONE sentence explaining WHY this patient received this risk level.

Rules:
1. Reference specific vital values that drove the prediction.
2. Use precise clinical language but keep it accessible to nurses.
3. Do NOT exceed one sentence.
4. Do NOT include disclaimers or hedging language."""


def generate_rationale(vitals: PatientVitals, risk_level: int) -> str:
    """Use Gemini (Agent 2) to generate a clinical rationale."""
    if state.gemini_client is None:
        raise RuntimeError("Gemini client not initialised")

    risk_label = RISK_LABELS.get(risk_level, "Unknown")

    prompt = (
        f"Patient vitals:\n"
        f"  Age: {vitals.age} years\n"
        f"  Blood Pressure: {vitals.systolic_bp}/{vitals.diastolic_bp} mmHg\n"
        f"  Heart Rate: {vitals.heart_rate} bpm\n"
        f"  O₂ Saturation: {vitals.o2_saturation}%\n"
        f"  Pain Score: {vitals.pain_score}/10\n\n"
        f"ML Triage Prediction: {risk_label} (level {risk_level})\n\n"
        f"Write one sentence explaining why this patient is classified as {risk_label}."
    )

    response = state.gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "system_instruction": EXPLAINER_SYSTEM_PROMPT,
            "temperature": 0.3,
        },
    )

    rationale = response.text.strip()
    logger.info(f"Explainer output: {rationale}")
    return rationale


# ────────────────────────────────────────────────────────────────────────────
# Routes
# ────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check() -> dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "healthy", "service": "medtriage"}


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    """Full cascading inference: Extract → Predict → Explain."""
    logger.info(f"Received prediction request ({len(request.raw_text)} chars)")

    # Stage 1: Extract vitals via Gemini
    try:
        vitals = extract_vitals(request.raw_text)
    except Exception as exc:
        logger.error(f"Extraction failed: {exc}")
        raise HTTPException(
            status_code=422,
            detail=f"Failed to extract vitals from text: {str(exc)}",
        )

    # Stage 2: ML prediction
    try:
        risk_level = predict_risk(vitals)
    except Exception as exc:
        logger.error(f"ML prediction failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"ML model prediction failed: {str(exc)}",
        )

    # Stage 3: Generate rationale via Gemini
    try:
        rationale = generate_rationale(vitals, risk_level)
    except Exception as exc:
        logger.error(f"Rationale generation failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Rationale generation failed: {str(exc)}",
        )

    risk_label = RISK_LABELS.get(risk_level, "Unknown")

    return PredictResponse(
        vitals=vitals,
        risk_level=risk_level,
        risk_label=risk_label,
        rationale=rationale,
    )
