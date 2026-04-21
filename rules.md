# MedTriage — Coding Rules & AI Assistant Guidelines

These rules apply to all AI-assisted code generation for the MedTriage project.

---

## Strict Rules

1. **No Placeholders.** Every function, handler, and component must be fully
   implemented. `// TODO`, `pass`, `...`, and stub functions are forbidden.

2. **No Mock Data in Production Code.** Mocked/synthetic data is only allowed
   inside `ml/train_model.py`. The backend and frontend must use real API calls.

3. **Strict Typing.** All Python code uses Pydantic models and type hints.
   All TypeScript code uses explicit types — no `any` except for JSON parsing
   boundaries.

4. **Single Responsibility.** Each file has one job. `train_model.py` trains.
   `main.py` serves. `page.tsx` renders.

---

## UI / UX Theme: Paper-Minimal

The frontend aesthetic is **paper-minimal with vintage undertones**:

- **Background:** Off-white / parchment (`#FAF8F5` or similar warm white)
- **Text:** Stark black or very dark gray (`#1A1A1A`)
- **Cards/Overlays:** Glass-morphism (translucent white, backdrop blur, subtle border)
- **Tables:** Monochrome, clean, high-contrast
- **Accent Color:** Matcha green (`#7BAE7F` or similar muted sage green)
  - Used ONLY for the "Analyze Patient" submit button
  - Used ONLY for "Routine/Stable" status indicators
- **Status Colors:**
  - Routine: Matcha green
  - Urgent: Warm amber/orange
  - Critical: Deep red
- **Typography:** Serif for headings (Georgia or similar), monospace for vitals data

### Forbidden UI Patterns

- No gradients on backgrounds
- No neon or saturated accent colors
- No rounded-pill buttons (use subtle rounding only)
- No skeleton loaders (use a simple spinner or pulse animation)

---

## Backend Rules

1. **FastAPI conventions:** Use `Annotated` style, return Pydantic models,
   use `def` (sync) for blocking calls.

2. **Gemini SDK:** Use `google-genai` (the modern SDK, NOT the deprecated
   `google-generativeai`). Use `gemini-2.5-flash` model.

3. **Model loading:** Load the `.pkl` model once at startup via `@app.on_event`
   or module-level code. Never reload per-request.

4. **Error handling:** Return structured error responses with HTTP status codes.
   Never let raw exceptions leak to the client.

---

## Git Commit Convention

```
type(scope): description

Types: feat, fix, chore, docs, style, refactor, test
Scopes: ml, backend, frontend, docs
```
