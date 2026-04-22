"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getAuthInstance } from "@/lib/firebase";

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
  translated_text?: string | null;
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

const VITALS_META: { key: keyof PatientVitals; label: string; unit: string; min: number; max: number }[] = [
  { key: "age", label: "Age", unit: "years", min: 0, max: 120 },
  { key: "systolic_bp", label: "Systolic BP", unit: "mmHg", min: 40, max: 250 },
  { key: "diastolic_bp", label: "Diastolic BP", unit: "mmHg", min: 20, max: 150 },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", min: 30, max: 220 },
  { key: "o2_saturation", label: "O₂ Saturation", unit: "%", min: 50, max: 100 },
  { key: "pain_score", label: "Pain Score", unit: "/10", min: 0, max: 10 },
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
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  
  // SBAR State
  const [sbarLoading, setSbarLoading] = useState(false);
  const [sbarResult, setSbarResult] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // ── Init Speech Recognition ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setRawText((prev) => (prev ? prev + " " + finalTranscript : finalTranscript));
          }
        };
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };
      }
    }
  }, []);

  // ── Auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthInstance(), (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  async function handleLogout(): Promise<void> {
    await signOut(getAuthInstance());
    router.push("/");
  }

  // ── Voice Toggle ──
  function toggleRecording() {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }

  // ── Standard Predict ──
  async function handleAnalyze(): Promise<void> {
    if (!rawText.trim() || rawText.trim().length < 10) {
      setError("Please enter at least 10 characters of patient intake notes.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSbarResult(null);

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

  // ── Multimodal File Upload ──
  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("uploading");
    setLoading(true);
    setError(null);
    setResult(null);
    setSbarResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      const mimeType = file.type;

      try {
        const response = await fetch(`${API_URL}/predict_multimodal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            image_base64: base64String, 
            mime_type: mimeType,
            raw_text: rawText 
          }),
        });

        if (!response.ok) {
          const errBody = await response.json();
          throw new Error(errBody.detail || "Failed to process image");
        }

        const data = await response.json();
        setResult(data);
        setUploadStatus("success");
        setTimeout(() => setUploadStatus(null), 3000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Image upload failed.";
        setError(message);
        setUploadStatus("error");
        setTimeout(() => setUploadStatus(null), 3000);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // ── What-If Recalculation ──
  async function handleVitalChange(key: keyof PatientVitals, val: number) {
    if (!result) return;
    const newVitals = { ...result.vitals, [key]: val };
    
    // Optimistic UI update
    setResult({ ...result, vitals: newVitals });
    setSbarResult(null); // Clear outdated SBAR

    // Debounce
    if ((window as any).recalcTimer) clearTimeout((window as any).recalcTimer);
    (window as any).recalcTimer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/recalculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newVitals),
        });
        if (response.ok) {
          const data = await response.json();
          setResult(data);
        }
      } catch (err) {
        console.error("Recalculate failed", err);
      }
    }, 500);
  }

  // ── Generate SBAR ──
  async function handleGenerateSbar() {
    if (!result) return;
    setSbarLoading(true);
    try {
      const response = await fetch(`${API_URL}/generate_sbar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vitals: result.vitals,
          risk_level: result.risk_level,
          risk_label: result.risk_label,
          rationale: result.rationale
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSbarResult(data.sbar_text);
      } else {
        throw new Error("Failed to generate SBAR");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate SBAR report.");
    } finally {
      setSbarLoading(false);
    }
  }

  function handleCopySbar() {
    if (sbarResult) {
      navigator.clipboard.writeText(sbarResult);
      alert("Copied to clipboard!");
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
    setSbarResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const riskConfig = result ? RISK_CONFIG[result.risk_label] : null;

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
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <button
                id="btn-upload-scan"
                onClick={triggerFileInput}
                disabled={uploadStatus === "uploading"}
                className="text-xs px-3 py-1.5 border border-matcha/40 rounded text-matcha-dark hover:bg-matcha-light transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {uploadStatus === "uploading" ? "Processing..." : uploadStatus === "success" ? "✓ Done" : uploadStatus === "error" ? "✗ Failed" : "Upload ECG/Scan"}
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

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-muted" style={{ fontFamily: "var(--font-serif)" }}>
              Type, dictate, or paste multilingual patient intake notes.
            </p>
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 border rounded transition-colors ${
                isRecording ? "bg-critical-red/10 border-critical-red text-critical-red pulse" : "border-ink/15 text-ink-light hover:bg-parchment-dark"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isRecording ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
              {isRecording ? "Recording..." : "Dictate"}
            </button>
          </div>

          <textarea
            id="intake-textarea"
            className="intake-textarea"
            placeholder="e.g., 58 year old female presenting with chest pain, BP 165/102, heart rate 112, O2 94%, pain 8/10... (Supports Hindi, Tamil, Telugu, Marathi)"
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
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && !loading && (
          <div className="space-y-6 slide-up">
            
            {/* Translation Banner */}
            {result.vitals.translated_text && (
              <div className="fade-in bg-amber/10 border border-amber/30 p-4 rounded-md">
                <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1" style={{ fontFamily: "var(--font-mono)" }}>
                  Auto-Translated from Foreign Input
                </h4>
                <p className="text-sm text-ink" style={{ fontFamily: "var(--font-serif)" }}>
                  {result.vitals.translated_text}
                </p>
              </div>
            )}

            {/* Risk Level Card */}
            <section className="glass-card p-8 transition-colors duration-500" style={{ 
              borderColor: result.risk_label === "Critical" ? 'var(--color-critical-red)' : undefined,
              boxShadow: result.risk_label === "Critical" ? '0 0 20px rgba(239, 68, 68, 0.1)' : undefined
            }}>
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
                      className="text-3xl font-bold tracking-tight transition-colors"
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
                  Clinical Rationale (Real-Time)
                </h4>
                <p className="text-base text-ink leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
                  {result.rationale}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vitals & What-If Sliders */}
              <section className="glass-card p-6">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
                    Interactive Vitals ("What-If")
                  </h3>
                </div>
                <div className="space-y-4">
                  {VITALS_META.map(({ key, label, unit, min, max }) => (
                    <div key={key} className="px-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-sm font-medium text-ink">{label}</label>
                        <span className="text-sm font-bold text-ink">
                          {result.vitals[key]} <span className="text-xs font-normal text-ink-muted">{unit}</span>
                        </span>
                      </div>
                      <input 
                        type="range"
                        className="w-full h-1.5 bg-ink/10 rounded-lg appearance-none cursor-pointer accent-matcha"
                        min={min}
                        max={max}
                        value={result.vitals[key] as number}
                        onChange={(e) => handleVitalChange(key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-muted mt-4 px-2 italic text-center">
                  Drag the sliders to instantly recalculate risk.
                </p>
              </section>

              {/* SBAR Generator */}
              <section className="glass-card p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider" style={{ fontFamily: "var(--font-mono)" }}>
                    Automated SBAR Handoff
                  </h3>
                  <button 
                    onClick={handleGenerateSbar}
                    disabled={sbarLoading}
                    className="text-xs px-3 py-1.5 bg-ink text-parchment rounded hover:bg-ink-light transition-colors"
                  >
                    {sbarLoading ? "Generating..." : "Generate Report"}
                  </button>
                </div>
                
                {sbarResult ? (
                  <div className="flex flex-col flex-grow">
                    <textarea 
                      readOnly
                      value={sbarResult}
                      className="flex-grow w-full h-48 p-3 text-sm bg-parchment-dark border border-ink/10 rounded font-mono text-ink leading-relaxed resize-none focus:outline-none"
                    />
                    <button 
                      onClick={handleCopySbar}
                      className="mt-3 text-xs w-full py-2 border border-ink/20 rounded hover:bg-ink/5 transition-colors font-medium flex justify-center items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Copy to EMR
                    </button>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center border-2 border-dashed border-ink/10 rounded-md p-6 text-center">
                    <p className="text-sm text-ink-muted" style={{ fontFamily: "var(--font-serif)" }}>
                      Click "Generate Report" to create a clinical SBAR handoff based on the current vitals and risk profile.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Pipeline Metadata */}
            <section className="text-center py-4">
              <p className="text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
                Pipeline: Gemini Extract/Translate → RandomForest Predict → Gemini Explain → Gemini SBAR
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
              Enter intake notes, speak, or upload an ECG scan to begin.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-ink/10 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
          <span>MedTriage v2.0 — Hackovium 2026</span>
          <span>Multimodal • Multilingual • Interactive</span>
        </div>
      </footer>
    </main>
  );
}
