"use client";

import { useState, useEffect, useRef } from "react";
import { signInWithPopup, onAuthStateChanged, type User } from "firebase/auth";
import { getAuthInstance, googleProvider } from "@/lib/firebase";

import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const [heroRef, heroVisible] = useInView(0.1);
  const [problemRef, problemVisible] = useInView(0.1);
  const [solutionRef, solutionVisible] = useInView(0.1);
  const [archRef, archVisible] = useInView(0.1);
  const [featuresRef, featuresVisible] = useInView(0.1);
  const [metricsRef, metricsVisible] = useInView(0.1);

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
      router.push("/dashboard");
    } catch {
      setLoginLoading(false);
    }
  }

  function goToDashboard(): void {
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-parchment overflow-x-hidden selection:bg-matcha selection:text-white">
      {/* ─── Sticky Header ─── */}
      <header className="border-b border-ink/10 bg-parchment/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 animate-float" style={{ animationDuration: '6s' }}>
            <div className="w-10 h-10 rounded-sm bg-matcha flex items-center justify-center shadow-lg shadow-matcha/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-ink" style={{ fontFamily: "var(--font-serif)" }}>
              MedTriage
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide" style={{ fontFamily: "var(--font-mono)" }}>
            <a href="#problem" className="text-ink-muted hover:text-matcha transition-colors relative group">
              Problem
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-matcha transition-all group-hover:w-full"></span>
            </a>
            <a href="#solution" className="text-ink-muted hover:text-matcha transition-colors relative group">
              Solution
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-matcha transition-all group-hover:w-full"></span>
            </a>
            <a href="#architecture" className="text-ink-muted hover:text-matcha transition-colors relative group">
              Architecture
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-matcha transition-all group-hover:w-full"></span>
            </a>
          </nav>
          <div className="flex items-center">
            {!authLoading && (
              user ? (
                <button onClick={goToDashboard} className="btn-analyze text-sm px-6 py-2.5 rounded-full hover:scale-105 transition-transform">
                  Dashboard
                </button>
              ) : (
                <button onClick={handleLogin} disabled={loginLoading} className="btn-analyze text-sm px-6 py-2.5 rounded-full hover:scale-105 transition-transform">
                  {loginLoading ? "Loading..." : "Sign In"}
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* ─── Immersive Hero Section ─── */}
      <section ref={heroRef} className="relative max-w-6xl mx-auto px-6 pt-32 pb-24 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-matcha/5 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-amber/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1.5s' }}></div>

        <div className={`relative z-10 max-w-4xl mx-auto text-center transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 bg-white/50 backdrop-blur-sm border border-ink/10 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-matcha animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest text-ink-light" style={{ fontFamily: "var(--font-mono)" }}>
              NEXT-GEN ER TRIAGE
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tighter mb-8 text-ink" style={{ fontFamily: "var(--font-serif)" }}>
            Stop guessing. <br />
            <span className="text-gradient">Let AI read the intake.</span>
          </h1>

          <p className="text-xl md:text-2xl text-ink-light leading-relaxed mb-12 max-w-3xl mx-auto" style={{ fontFamily: "var(--font-serif)" }}>
            A cascading hybrid AI system that transforms messy, unstructured nurse notes into 
            instant, accurate risk classifications with clinical rationale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {!authLoading && (
              user ? (
                <button onClick={goToDashboard} className="btn-analyze text-lg px-10 py-4 rounded-full shadow-lg shadow-matcha/30 hover:shadow-matcha/50 animate-float">
                  <span className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    Enter Dashboard
                  </span>
                </button>
              ) : (
                <button onClick={handleLogin} disabled={loginLoading} className="btn-analyze text-lg px-10 py-4 rounded-full shadow-lg shadow-matcha/30 hover:shadow-matcha/50 animate-float">
                  {loginLoading ? (
                    <><span className="spinner" /> Authenticating...</>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Launch with Google
                    </>
                  )}
                </button>
              )
            )}
            <a href="#problem" className="text-ink font-semibold border-b-2 border-ink pb-1 hover:text-matcha hover:border-matcha transition-colors" style={{ fontFamily: "var(--font-mono)" }}>
              Read the Manifesto ↓
            </a>
          </div>
        </div>
      </section>

      {/* ─── Problem Statement (Paper Theme) ─── */}
      <section id="problem" ref={problemRef} className={`py-24 transition-all duration-1000 ${problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-1/2">
              <span className="text-sm text-matcha font-bold uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>01 — The Crisis</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-ink leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
                Emergency rooms are breaking under the weight of subjective triage.
              </h2>
              <p className="text-lg text-ink-light leading-relaxed mb-6" style={{ fontFamily: "var(--font-serif)" }}>
                When a patient walks into an ER, nurses have seconds to read complex, unstructured data and make a life-or-death classification. Fatigue, cognitive overload, and bias lead to dangerous under-triaging.
              </p>
              <ul className="space-y-4 mb-8">
                {['High cognitive load during peak hours', 'Subjective interpretation of vitals', 'Critical delays in recognizing deterioration'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-critical-red shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span className="text-ink font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="md:w-1/2 w-full">
              <div className="paper-stack p-8 rotate-1">
                <div className="font-mono text-xs text-ink-muted mb-6 pb-2 border-b border-ink/10 flex justify-between">
                  <span>ER_REPORT_2025.TXT</span>
                  <span>CONFIDENTIAL</span>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-4xl font-bold text-ink mb-1" style={{ fontFamily: "var(--font-serif)" }}>4.5 hours</p>
                    <p className="text-sm font-bold text-matcha uppercase tracking-wide">Average US Wait Time</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-ink mb-1" style={{ fontFamily: "var(--font-serif)" }}>30%</p>
                    <p className="text-sm font-bold text-matcha uppercase tracking-wide">Triage Error Rate</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-ink mb-1" style={{ fontFamily: "var(--font-serif)" }}>150M+</p>
                    <p className="text-sm font-bold text-matcha uppercase tracking-wide">Annual ER Visits</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── The Solution (Features) ─── */}
      <section id="solution" ref={featuresRef} className={`py-24 bg-parchment-dark/30 border-y border-ink/5 transition-all duration-1000 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
        <div className="max-w-6xl mx-auto px-6 text-center mb-16">
          <span className="text-sm text-matcha font-bold uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>02 — The Paradigm Shift</span>
          <h2 className="text-4xl md:text-5xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
            One text box. Instant clarity.
          </h2>
        </div>

        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Raw Intake Parsing",
              desc: "Nurses just type naturally. No dropdowns, no rigid forms. Our LLM pipeline instantly structures messy text into precise vitals.",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            },
            {
              step: "02",
              title: "Classical ML Prediction",
              desc: "A highly-optimized Random Forest model takes the structured vitals and predicts risk (Routine, Urgent, Critical) with robust accuracy.",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            },
            {
              step: "03",
              title: "Clinical Rationale",
              desc: "A second LLM step generates a one-sentence, human-readable rationale explaining exactly why the ML model made its prediction.",
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            }
          ].map((feature, i) => (
            <div key={i} className="paper-stack p-8 group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-full bg-matcha/10 flex items-center justify-center mb-6 group-hover:bg-matcha group-hover:text-white transition-colors text-matcha">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{feature.icon}</svg>
              </div>
              <span className="text-xs font-bold text-matcha-dark mb-2 block tracking-widest" style={{ fontFamily: "var(--font-mono)" }}>PHASE {feature.step}</span>
              <h3 className="text-2xl font-bold mb-3 text-ink" style={{ fontFamily: "var(--font-serif)" }}>{feature.title}</h3>
              <p className="text-ink-light leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Architecture Deep Dive ─── */}
      <section id="architecture" ref={archRef} className={`py-24 transition-all duration-1000 ${archVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm text-matcha font-bold uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>03 — Hybrid AI Engine</span>
            <h2 className="text-4xl md:text-5xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
              Cascading Intelligence.
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-ink/10 -translate-y-1/2 z-0"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Node 1 */}
              <div className="bg-parchment border-2 border-ink rounded-xl p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] transition-all">
                <div className="flex items-center gap-3 mb-4 border-b-2 border-ink/10 pb-4">
                  <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center font-bold">1</div>
                  <h4 className="text-xl font-bold">Gemini Extractor</h4>
                </div>
                <p className="text-sm text-ink-light mb-4 font-mono">Input: Unstructured Text<br/>Output: Structured JSON</p>
                <div className="bg-ink/5 p-3 rounded font-mono text-xs text-matcha-dark">
                  {"{"}<br/>
                  &nbsp;&nbsp;"heart_rate": 110,<br/>
                  &nbsp;&nbsp;"o2_saturation": 94.5<br/>
                  {"}"}
                </div>
              </div>

              {/* Node 2 */}
              <div className="bg-parchment border-2 border-matcha rounded-xl p-6 shadow-[8px_8px_0px_0px_rgba(123,174,127,1)] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(123,174,127,1)] transition-all md:-translate-y-4">
                <div className="flex items-center gap-3 mb-4 border-b-2 border-matcha/20 pb-4">
                  <div className="w-8 h-8 rounded-full bg-matcha text-white flex items-center justify-center font-bold">2</div>
                  <h4 className="text-xl font-bold">Random Forest ML</h4>
                </div>
                <p className="text-sm text-ink-light mb-4 font-mono">Input: Vital Matrix<br/>Output: Risk Vector</p>
                <div className="bg-matcha/10 p-3 rounded font-mono text-xs text-matcha-dark font-bold">
                  PREDICTION: URGENT
                </div>
              </div>

              {/* Node 3 */}
              <div className="bg-parchment border-2 border-ink rounded-xl p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] transition-all">
                <div className="flex items-center gap-3 mb-4 border-b-2 border-ink/10 pb-4">
                  <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center font-bold">3</div>
                  <h4 className="text-xl font-bold">Gemini Explainer</h4>
                </div>
                <p className="text-sm text-ink-light mb-4 font-mono">Input: Vitals + Risk<br/>Output: Natural Language</p>
                <div className="bg-ink/5 p-3 rounded font-serif text-sm italic text-ink-light border-l-4 border-matcha">
                  "Elevated HR of 110 and reduced O2 sat of 94.5% indicates respiratory distress warranting urgent care."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Metrics Section ─── */}
      <section ref={metricsRef} className={`py-24 bg-ink text-parchment transition-all duration-1000 ${metricsVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-parchment/20 pb-8">
            <div>
              <span className="text-sm text-matcha font-bold uppercase tracking-widest mb-4 block" style={{ fontFamily: "var(--font-mono)" }}>04 — Proven Performance</span>
              <h2 className="text-4xl md:text-5xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>Model Metrics</h2>
            </div>
            <p className="font-mono text-parchment/50 mt-4 md:mt-0">EVAL_SET = 2000_SYNTHETIC</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12">
            {[
              { label: "Global Accuracy", value: "88.25%", desc: "Cross-validated" },
              { label: "Macro F1-Score", value: "0.88", desc: "Balanced classes" },
              { label: "MAE (Ordinal)", value: "0.13", desc: "Mean Absolute Error" },
              { label: "Inference Latency", value: "< 2.5s", desc: "End-to-end pipeline" },
            ].map((m, i) => (
              <div key={i} className="group cursor-default">
                <p className="text-4xl md:text-5xl font-bold mb-2 text-matcha group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-mono)" }}>{m.value}</p>
                <p className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-serif)" }}>{m.label}</p>
                <p className="text-sm text-parchment/50" style={{ fontFamily: "var(--font-mono)" }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Immersive CTA Section ─── */}
      <section className="py-32 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-block p-4 rounded-full bg-matcha/10 mb-8 animate-pulse-soft">
            <svg className="w-12 h-12 text-matcha" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-ink" style={{ fontFamily: "var(--font-serif)" }}>
            Ready to revolutionize your ER?
          </h2>
          <p className="text-xl text-ink-light mb-12 max-w-2xl mx-auto" style={{ fontFamily: "var(--font-serif)" }}>
            Deploy MedTriage today and bring clarity, speed, and safety back to the front lines of healthcare.
          </p>
          
          <div className="flex justify-center">
            {!authLoading && (
              user ? (
                <button onClick={goToDashboard} className="btn-analyze text-xl px-12 py-5 rounded-full shadow-[0_0_40px_rgba(123,174,127,0.4)] hover:shadow-[0_0_60px_rgba(123,174,127,0.6)] transform hover:-translate-y-1 transition-all duration-300">
                  Launch MedTriage Dashboard
                </button>
              ) : (
                <button onClick={handleLogin} disabled={loginLoading} className="btn-analyze text-xl px-12 py-5 rounded-full shadow-[0_0_40px_rgba(123,174,127,0.4)] hover:shadow-[0_0_60px_rgba(123,174,127,0.6)] transform hover:-translate-y-1 transition-all duration-300">
                  {loginLoading ? "Authenticating..." : "Login with Google"}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-ink/10 bg-parchment-dark">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span className="font-bold text-lg" style={{ fontFamily: "var(--font-serif)" }}>MedTriage</span>
          </div>
          <div className="text-sm text-ink-muted font-mono tracking-widest uppercase">
            Hackovium April 2026 // Open Source
          </div>
          <div className="text-sm font-mono text-matcha font-bold">
            LLM → ML → LLM
          </div>
        </div>
      </footer>
    </main>
  );
}
