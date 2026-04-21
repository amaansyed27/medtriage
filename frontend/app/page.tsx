"use client";

import { useState, useEffect, useRef } from "react";
import { signInWithPopup, onAuthStateChanged, type User } from "firebase/auth";
import { getAuthInstance, googleProvider } from "@/lib/firebase";

// ────────────────────────────────────────────────────────────────────────────
// Intersection Observer Hook
// ────────────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        obs.unobserve(el);
      }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// ────────────────────────────────────────────────────────────────────────────
// Landing Page
// ────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const [problemRef, problemVisible] = useInView();
  const [solutionRef, solutionVisible] = useInView();
  const [archRef, archVisible] = useInView();
  const [metricsRef, metricsVisible] = useInView();

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthInstance(), (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  async function handleLogin(): Promise<void> {
    setLoginLoading(true);
    try {
      await signInWithPopup(getAuthInstance(), googleProvider);
      window.location.href = "/dashboard";
    } catch {
      setLoginLoading(false);
    }
  }

  function goToDashboard(): void {
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-parchment">
      {/* ─── Sticky Header ─── */}
      <header className="border-b border-ink/8 bg-parchment/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-matcha flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
              MedTriage
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm" style={{ fontFamily: "var(--font-mono)" }}>
            <a href="#problem" className="text-ink-muted hover:text-ink transition-colors">Problem</a>
            <a href="#solution" className="text-ink-muted hover:text-ink transition-colors">Solution</a>
            <a href="#architecture" className="text-ink-muted hover:text-ink transition-colors">Architecture</a>
            {!authLoading && (
              user ? (
                <button onClick={goToDashboard} className="btn-analyze text-sm px-4 py-2">
                  Open Dashboard
                </button>
              ) : (
                <button onClick={handleLogin} disabled={loginLoading} className="btn-analyze text-sm px-4 py-2">
                  {loginLoading ? "Signing in..." : "Sign In"}
                </button>
              )
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <span className="px-2 py-1 text-xs bg-matcha-light text-matcha-dark rounded-sm font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
              HACKOVIUM 2026
            </span>
            <span className="px-2 py-1 text-xs bg-ink/5 text-ink-light rounded-sm" style={{ fontFamily: "var(--font-mono)" }}>
              LLM → ML → LLM
            </span>
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight mb-6" style={{ fontFamily: "var(--font-serif)" }}>
            Stop guessing triage levels.
            <br />
            <span style={{ color: "var(--color-matcha-dark)" }}>Let AI read the intake.</span>
          </h1>

          <p className="text-lg text-ink-light leading-relaxed mb-10 max-w-2xl" style={{ fontFamily: "var(--font-serif)" }}>
            MedTriage is a cascading AI system that takes raw, unstructured nurse notes and
            instantly produces a risk classification with a clinical rationale — powered by
            Gemini extraction, Random Forest prediction, and Gemini explanation.
          </p>

          {!authLoading && (
            user ? (
              <button onClick={goToDashboard} className="btn-analyze text-base px-8 py-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Open Dashboard
              </button>
            ) : (
              <button onClick={handleLogin} disabled={loginLoading} className="btn-analyze text-base px-8 py-3">
                {loginLoading ? (
                  <><span className="spinner" /> Signing in...</>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Login with Google to Launch
                  </>
                )}
              </button>
            )
          )}
        </div>
      </section>

      {/* ─── Problem Section ─── */}
      <section id="problem" ref={problemRef} className={`py-20 border-t border-ink/8 transition-all duration-700 ${problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-5xl mx-auto px-6">
          <span className="text-xs text-ink-muted uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>01 — THE PROBLEM</span>
          <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-serif)" }}>
            Triage is slow, subjective, and error-prone.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "4.5hrs", label: "Average ER wait time in the US", detail: "Patients with urgent conditions wait alongside routine cases." },
              { stat: "30%", label: "Triage errors in high-volume ERs", detail: "Under-triaged patients miss critical intervention windows." },
              { stat: "~150M", label: "Annual ER visits in the US alone", detail: "Every minute of triage delay scales across millions of patients." },
            ].map((item, i) => (
              <div key={i} className="glass-card p-6" style={{ animationDelay: `${i * 0.15}s` }}>
                <p className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-mono)", color: "var(--color-matcha-dark)" }}>
                  {item.stat}
                </p>
                <p className="text-sm font-semibold text-ink mb-2" style={{ fontFamily: "var(--font-serif)" }}>{item.label}</p>
                <p className="text-xs text-ink-muted leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution Section ─── */}
      <section id="solution" ref={solutionRef} className={`py-20 border-t border-ink/8 transition-all duration-700 ${solutionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-5xl mx-auto px-6">
          <span className="text-xs text-ink-muted uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>02 — THE SOLUTION</span>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-serif)" }}>
            One text box. Instant triage.
          </h2>
          <p className="text-base text-ink-light mb-10 max-w-2xl" style={{ fontFamily: "var(--font-serif)" }}>
            A nurse types raw intake notes — messy, unstructured, natural language. MedTriage
            does the rest: extracting vitals, classifying risk, and explaining why in under 3 seconds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Paste Notes", desc: "Type or paste raw nurse intake text into a single text box. No forms, no dropdowns, no structured input required." },
              { step: "02", title: "AI Extracts & Predicts", desc: "Gemini extracts 6 vitals, Random Forest classifies risk level (Routine / Urgent / Critical) with 88% accuracy." },
              { step: "03", title: "Read the Rationale", desc: "A second Gemini agent writes one sentence explaining why this patient got this risk level, citing specific vitals." },
            ].map((item, i) => (
              <div key={i} className="glass-card p-6">
                <span className="text-xs font-bold text-matcha-dark mb-3 block" style={{ fontFamily: "var(--font-mono)" }}>
                  STEP {item.step}
                </span>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--font-serif)" }}>{item.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Architecture Section ─── */}
      <section id="architecture" ref={archRef} className={`py-20 border-t border-ink/8 transition-all duration-700 ${archVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-5xl mx-auto px-6">
          <span className="text-xs text-ink-muted uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>03 — ARCHITECTURE</span>
          <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-serif)" }}>
            Cascading LLM → ML → LLM
          </h2>

          <div className="glass-card p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {[
                { label: "GEMINI EXTRACTOR", sub: "Agent 1 · Structured JSON", color: "var(--color-ink)" },
                { label: "RANDOM FOREST", sub: "Scikit-Learn · 100 trees", color: "var(--color-matcha-dark)" },
                { label: "GEMINI EXPLAINER", sub: "Agent 2 · Clinical rationale", color: "var(--color-ink)" },
              ].map((stage, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="text-center flex-1 min-w-[160px]">
                    <div className="border border-ink/15 rounded-md p-4 bg-parchment/50">
                      <p className="text-xs font-bold tracking-wider mb-1" style={{ fontFamily: "var(--font-mono)", color: stage.color }}>
                        {stage.label}
                      </p>
                      <p className="text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>{stage.sub}</p>
                    </div>
                  </div>
                  {i < 2 && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted hidden md:block">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-ink/10 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: "Frontend", value: "Next.js 15" },
                { label: "Backend", value: "FastAPI" },
                { label: "ML Model", value: "Random Forest" },
                { label: "LLM", value: "Gemini 2.5 Flash" },
              ].map((tech, i) => (
                <div key={i}>
                  <p className="text-xs text-ink-muted mb-1" style={{ fontFamily: "var(--font-mono)" }}>{tech.label}</p>
                  <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-serif)" }}>{tech.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metrics Section ─── */}
      <section ref={metricsRef} className={`py-20 border-t border-ink/8 transition-all duration-700 ${metricsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="max-w-5xl mx-auto px-6">
          <span className="text-xs text-ink-muted uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>04 — PERFORMANCE</span>
          <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-serif)" }}>Model Metrics</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Accuracy", value: "88.25%", color: "var(--color-matcha-dark)" },
              { label: "Macro F1", value: "0.88", color: "var(--color-ink)" },
              { label: "MAE (ordinal)", value: "0.13", color: "var(--color-ink)" },
              { label: "Training Data", value: "2,000", color: "var(--color-ink-light)" },
            ].map((m, i) => (
              <div key={i} className="glass-card p-5 text-center">
                <p className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-mono)", color: m.color }}>{m.value}</p>
                <p className="text-xs text-ink-muted" style={{ fontFamily: "var(--font-serif)" }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-20 border-t border-ink/8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-serif)" }}>
            Ready to try it?
          </h2>
          <p className="text-base text-ink-muted mb-8" style={{ fontFamily: "var(--font-serif)" }}>
            Sign in with Google and start triaging patients in seconds.
          </p>
          {!authLoading && (
            user ? (
              <button onClick={goToDashboard} className="btn-analyze text-base px-8 py-3">
                Open Dashboard →
              </button>
            ) : (
              <button onClick={handleLogin} disabled={loginLoading} className="btn-analyze text-base px-8 py-3">
                {loginLoading ? "Signing in..." : "Login with Google to Launch →"}
              </button>
            )
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ink/8">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-ink-muted" style={{ fontFamily: "var(--font-mono)" }}>
          <span>MedTriage v1.0 — Hackovium April 2026</span>
          <span>LLM → ML → LLM</span>
        </div>
      </footer>
    </main>
  );
}
