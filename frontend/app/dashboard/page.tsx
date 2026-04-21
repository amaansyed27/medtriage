"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { ref, uploadBytes } from "firebase/storage";
import { getAuthInstance, getStorageInstance } from "@/lib/firebase";

import { useRouter } from "next/navigation";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface PatientVitals {
  age: number;
  systolic_bp: number;
  diastolic_bp: number;
  heart_rate: number;
  o2_saturation: number;
  pain_score: number;
}

interface PredictResponse {
  vitals: PatientVitals;
  risk_level: number;
  risk_label: string;
  rationale: string;
}

interface ApiError {
  detail: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const VITALS_META: { key: keyof PatientVitals; label: string; unit: string }[] = [
  { key: "age", label: "Age", unit: "years" },
  { key: "systolic_bp", label: "Systolic BP", unit: "mmHg" },
  { key: "diastolic_bp", label: "Diastolic BP", unit: "mmHg" },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm" },
  { key: "o2_saturation", label: "O₂ Saturation", unit: "%" },
  { key: "pain_score", label: "Pain Score", unit: "/10" },
];

const RISK_CONFIG: Record<string, { badge: string; dot: string; text: string }> = {
  Routine: {
    badge: "badge-routine",
    dot: "bg-matcha",
    text: "Stable vitals — standard intake pathway.",
  },
  Urgent: {
    badge: "badge-urgent",
    dot: "bg-amber",
    text: "Elevated parameters — prioritise assessment.",
  },
  Critical: {
    badge: "badge-critical",
    dot: "bg-critical-red",
    text: "Immediate intervention required.",
  },
};

const SAMPLE_TEXT =
  "72 year old male, BP 182/118, heart rate 134 bpm, O2 sat 86%, pain 9 out of 10. Patient is diaphoretic and short of breath.";

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function TriageDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rawText, setRawText] = useState<string>("");
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthInstance(), (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Redirect to login if not authenticated ──
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  async function handleLogout(): Promise<void> {
    await signOut(getAuthInstance());
    router.push("/");
  }

  async function handleAnalyze(): Promise<void> {
    if (!rawText.trim() || rawText.trim().length < 10) {
      setError("Please enter at least 10 characters of patient intake notes.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });

      if (!response.ok) {
        const errBody: ApiError = await response.json();
        throw new Error(errBody.detail || `Server error (${response.status})`);
      }

      const data: PredictResponse = await response.json();
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleLoadSample(): void {
    setRawText(SAMPLE_TEXT);
    setError(null);
  }

  function handleClear(): void {
    setRawText("");
    setResult(null);
    setError(null);
  }

  async function handleUploadScan(): Promise<void> {
    if (!user) return;
    setUploadStatus("uploading");

    try {
      // Create a simple text blob to simulate a scan upload
      const scanData = new Blob(
        [`Patient scan placeholder - uploaded by ${user.email} at ${new Date().toISOString()}`],
        { type: "text/plain" }
      );
      const scanRef = ref(getStorageInstance(), `patient-scans/${user.uid}/scan_${Date.now()}.txt`);
      await uploadBytes(scanRef, scanData);
      setUploadStatus("success");
      setTimeout(() => setUploadStatus(null), 3000);
    } catch {
      setUploadStatus("error");
      setTimeout(() => setUploadStatus(null), 3000);
    }
  }

  const riskConfig = result ? RISK_CONFIG[result.risk_label] : null;

  // Show nothing while checking auth
  if (authLoading) {
    return (
      <main className="min-h-screen bg-parchment flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <p className="text-sm text-ink-muted" style={{ fontFamily: "var(--font-serif)" }}>Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-parchment">
      {/* ── Header ── */}
      <header className="border-b border-ink/10 bg-parchment/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-matcha flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-ink" style={{ fontFamily: "var(--font-serif)" }}>
                MedTriage
              </h1>
              <p className="text-xs text-ink-muted tracking-wide" style={{ fontFamily: "var(--font-mono)" }}>
                AI-POWERED TRIAGE SYSTEM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
              <span className="w-2 h-2 rounded-full bg-matcha inline-block" />
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 border border-ink/15 rounded text-ink-light hover:bg-parchment-dark transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* ── Architecture Indicator ── */}
        <div className="flex items-center gap-2 mb-8 text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="px-2 py-0.5 bg-ink/5 rounded text-ink-light">GEMINI EXTRACT</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="px-2 py-0.5 bg-ink/5 rounded text-ink-light">RF PREDICT</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="px-2 py-0.5 bg-ink/5 rounded text-ink-light">GEMINI EXPLAIN</span>
        </div>

        {/* ── Intake Section ── */}
        <section className="glass-card p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
              Magic Intake
            </h2>
            <div className="flex gap-2">
              <button
                id="btn-upload-scan"
                onClick={handleUploadScan}
                disabled={uploadStatus === "uploading"}
                className="text-xs px-3 py-1.5 border border-matcha/40 rounded text-matcha-dark hover:bg-matcha-light transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {uploadStatus === "uploading" ? "Uploading..." : uploadStatus === "success" ? "✓ Uploaded" : uploadStatus === "error" ? "✗ Failed" : "Upload Patient Scan"}
              </button>
              <button
                id="btn-load-sample"
                onClick={handleLoadSample}
                className="text-xs px-3 py-1.5 border border-ink/15 rounded text-ink-light hover:bg-parchment-dark transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Load Sample
              </button>
              <button
                id="btn-clear"
                onClick={handleClear}
                className="text-xs px-3 py-1.5 border border-ink/15 rounded text-ink-light hover:bg-parchment-dark transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Clear
              </button>
            </div>
          </div>

          <p className="text-sm text-ink-muted mb-4" style={{ fontFamily: "var(--font-serif)" }}>
            Type or paste raw patient intake notes. The AI will extract vitals, predict risk, and generate a clinical rationale.
          </p>

          <textarea
            id="intake-textarea"
            className="intake-textarea"
            placeholder="e.g., 58 year old female presenting with chest pain, BP 165/102, heart rate 112, O2 94%, pain 8/10..."
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading}
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
              {rawText.length} chars
            </span>
            <button
              id="btn-analyze"
              className="btn-analyze"
              onClick={handleAnalyze}
              disabled={loading || rawText.trim().length < 10}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  Analyze Patient
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── Error State ── */}
        {error && (
          <div className="fade-in mb-6 p-4 bg-critical-light border border-critical-red/20 rounded-md">
            <p className="text-sm text-critical-red font-medium" style={{ fontFamily: "var(--font-serif)" }}>
              {error}
            </p>
          </div>
        )}

        {/* ── Loading State ── */}
        {loading && (
          <div className="glass-card p-8 mb-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="spinner" style={{ width: 32, height: 32 }} />
              <p className="text-sm text-ink-muted pulse" style={{ fontFamily: "var(--font-serif)" }}>
                Running cascading inference pipeline...
              </p>
              <div className="flex items-center gap-2 text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
                <span className="text-matcha font-semibold">STAGE 1</span>
                <span>→ Extracting vitals via Gemini</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && !loading && (
          <div className="space-y-6 slide-up">
            {/* Risk Level Card */}
            <section className="glass-card p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-mono)" }}>
                    Triage Result
                  </h3>
                  <div className="flex items-center gap-3">
                    {riskConfig && (
                      <span className={`w-3 h-3 rounded-full ${riskConfig.dot}`} />
                    )}
                    <span
                      className="text-3xl font-bold tracking-tight"
                      style={{
                        fontFamily: "var(--font-serif)",
                        color:
                          result.risk_label === "Critical"
                            ? "var(--color-critical-red)"
                            : result.risk_label === "Urgent"
                            ? "var(--color-amber)"
                            : "var(--color-matcha-dark)",
                      }}
                    >
                      {result.risk_label}
                    </span>
                    {riskConfig && (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-sm font-semibold ${riskConfig.badge}`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        LEVEL {result.risk_level}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div className="border-t border-ink/10 pt-5">
                <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-mono)" }}>
                  Clinical Rationale
                </h4>
                <p className="text-base text-ink leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
                  {result.rationale}
                </p>
              </div>
            </section>

            {/* Vitals Table */}
            <section className="glass-card p-6">
              <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4 px-2" style={{ fontFamily: "var(--font-mono)" }}>
                Extracted Vitals
              </h3>
              <div className="overflow-x-auto">
                <table className="vitals-table">
                  <thead>
                    <tr>
                      <th>Vital</th>
                      <th>Value</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VITALS_META.map(({ key, label, unit }) => (
                      <tr key={key}>
                        <td className="font-medium">{label}</td>
                        <td>
                          <span className="font-bold text-ink">
                            {result.vitals[key]}
                          </span>
                        </td>
                        <td className="text-ink-muted">{unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Pipeline Metadata */}
            <section className="text-center py-4">
              <p className="text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
                Pipeline: Gemini Extract → RandomForest Predict → Gemini Explain
              </p>
            </section>
          </div>
        )}

        {/* ── Empty State ── */}
        {!result && !loading && !error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-ink/5 mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <p className="text-sm text-ink-muted mb-1" style={{ fontFamily: "var(--font-serif)" }}>
              No patient data analysed yet.
            </p>
            <p className="text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
              Enter intake notes above and click &quot;Analyze Patient&quot;
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-ink/10 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
          <span>MedTriage v1.0 — Hackovium 2026</span>
          <span>LLM → ML → LLM</span>
        </div>
      </footer>
    </main>
  );
}
