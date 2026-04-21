# MedTriage — ML Model Card

> Following the format recommended by [Mitchell et al., 2019](https://arxiv.org/abs/1810.03993)

---

## Model Details

| Property | Value |
|----------|-------|
| **Model Name** | MedTriage Risk Classifier |
| **Model Type** | Random Forest Classifier (Ensemble) |
| **Framework** | Scikit-Learn 1.6+ |
| **Version** | 1.0.0 |
| **Date** | April 2026 |
| **License** | MIT |

### Architecture

- **Algorithm**: `RandomForestClassifier` — 100 trees, max_depth=8
- **Class Weight**: Balanced (auto reweighting for class imbalance)
- **Random State**: 42 (deterministic)

---

## Intended Use

The model is the **middle stage** of a 3-stage cascading pipeline:

```
Nurse Text → [Gemini Extractor] → Vitals → [THIS MODEL] → Risk Level → [Gemini Explainer] → Rationale
```

**NOT** a replacement for clinical judgment. Trained on synthetic data only.

---

## Training Data

| Property | Value |
|----------|-------|
| **Source** | Synthetically generated |
| **Records** | 2,000 |
| **Split** | 80/20 stratified |

### Features

| Feature | Distribution | Range |
|---------|-------------|-------|
| `age` | Uniform(18, 95) | 18–95 years |
| `systolic_bp` | Normal(125, 20) | 80–220 mmHg |
| `diastolic_bp` | Normal(80, 12) | 40–140 mmHg |
| `heart_rate` | Normal(80, 15) | 40–180 bpm |
| `o2_saturation` | Normal(96, 3) | 70–100% |
| `pain_score` | Uniform(0, 10) | 0–10 |

### Label Noise Injection (12%)

Labels are assigned via deterministic clinical thresholds, then **12% are flipped to adjacent classes** to simulate inter-annotator disagreement:

| Original | Can Flip To |
|----------|-------------|
| Routine (0) | Urgent (1) |
| Urgent (1) | Routine (0) or Critical (2) |
| Critical (2) | Urgent (1) |

### Class Distribution (After Noise)

| Class | Count | % |
|-------|------:|--:|
| Routine | 879 | 44.0 |
| Urgent | 777 | 38.9 |
| Critical | 344 | 17.2 |

---

## Evaluation Results

| Metric | Score |
|--------|------:|
| **Accuracy** | 0.8825 |
| **Macro F1** | 0.88 |
| **Macro Precision** | 0.89 |
| **Macro Recall** | 0.88 |
| **MAE (ordinal)** | 0.13 |
| **Pseudo R²** | 0.67 |

### Per-Class Performance

| Class | Precision | Recall | F1 | Support |
|-------|----------:|-------:|---:|--------:|
| Routine | 0.87 | 0.95 | 0.91 | 176 |
| Urgent | 0.89 | 0.80 | 0.84 | 155 |
| Critical | 0.91 | 0.90 | 0.91 | 69 |

### Confusion Matrix

```
              Pred-R   Pred-U   Pred-C
Act-Routine     167        9        0
Act-Urgent       24      124        7
Act-Critical      1        6       62
```

### Feature Importance

| Rank | Feature | Importance |
|-----:|---------|----------:|
| 1 | pain_score | 0.6679 |
| 2 | o2_saturation | 0.0968 |
| 3 | systolic_bp | 0.0886 |
| 4 | diastolic_bp | 0.0645 |
| 5 | heart_rate | 0.0464 |
| 6 | age | 0.0358 |

---

## Ethical Considerations

- No demographic features (race, sex) to avoid encoding healthcare disparities
- Balanced class weights prevent majority-class bias
- Designed as **decision support**, not autonomous decision-making
- Gemini Explainer provides transparency by citing specific vitals

### Limitations

1. Synthetic data only — never trained on real patients
2. Only 6 features — real triage is far more nuanced
3. No temporal trends considered
4. Binary threshold labeling may oversimplify clinical reality

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Under-triage | UI displays all vitals for manual verification |
| Over-triage | Rationale explains reasoning for clinician review |
| Automation bias | System framed as support, not replacement |

---

## Reproducibility

```bash
cd ml && python train_model.py
```

Generates `synthetic_patients.csv`, `medtriage_model.pkl`, and `training_report.md`. Deterministic with `RANDOM_SEED=42`.
