# ASTRA VIGIL — AI & Statistical Methodology

---

## 1. Problem Definition: The Limitations of Datasheet Screening
Traditional aerospace qualification relies on static manufacturer datasheet thresholds:
$$\text{Status} = \begin{cases} \text{PASS}, & \text{datasheet\_min} \le v_{168} \le \text{datasheet\_max} \\ \text{FAIL}, & \text{otherwise} \end{cases}$$

### The Failure Mode: Latent Defect Leakage
Consider a wafer lot of space-grade MOSFETs with a datasheet maximum leakage current of $50\,\mu\text{A}$.
- **Lot Baseline Median**: $10.2\,\mu\text{A}$
- **Normal Lot Standard Deviation**: $0.6\,\mu\text{A}$
- **Component Under Test (COMP-042)**: $42.5\,\mu\text{A}$

Under traditional screening:
$$42.5\,\mu\text{A} \le 50.0\,\mu\text{A} \implies \mathbf{PASS}$$
However, COMP-042 is $+53.8\sigma$ above its wafer peer population. This extreme peer divergence indicates gate oxide thinning, micro-cracking, or particulate contamination during epitaxial growth. If launched into orbit, high radiation and thermal cycling will trigger catastrophic in-flight breakdown.

---

## 2. Module A: Dynamic Lot-Relative Anomaly Detection
Module A normalizes each component against its peer cohort using non-parametric, outlier-resistant statistics:

1. **Median & Median Absolute Deviation (MAD)**:
   $$\text{Med} = \text{median}(V_{\text{lot}})$$
   $$\text{MAD} = \text{median}(|V_{\text{lot}} - \text{Med}|)$$
2. **Asymptotically Normal Scale Estimation**:
   $$\hat{\sigma}_{\text{robust}} = 1.4826 \times \text{MAD}$$
3. **Robust Z-Score**:
   $$z_{\text{robust}} = \frac{v_{168} - \text{Med}}{\hat{\sigma}_{\text{robust}}}$$
4. **Percentage Deviation**:
   $$\Delta\%_{\text{lot}} = \frac{v_{168} - \text{Med}}{\text{Med}} \times 100\%$$
5. **Latent Defect Condition**:
   $$\text{Latent} = \left(v_{168} \le \text{limit}\right) \land \left(|z_{\text{robust}}| \ge 3.0 \lor |\Delta\%_{\text{lot}}| \ge 35\% \lor |z_{\text{slope}}| \ge 3.5\right)$$

---

## 3. Module B: Temporal Burn-In Drift Analysis
Electronic components undergo High-Temperature Operating Life (HTOL) screening at 125°C across 4 critical time points:
$$t \in \{0\,\text{h}, 24\,\text{h}, 96\,\text{h}, 168\,\text{h}\}$$

### Feature Formulations:
- **Early Drift Velocity (0h $\rightarrow$ 24h)**:
  $$v_{\text{early}} = \frac{v_{24} - v_0}{24}$$
- **Late Drift Velocity (96h $\rightarrow$ 168h)**:
  $$v_{\text{late}} = \frac{v_{168} - v_{96}}{72}$$
- **Temporal Acceleration**:
  $$a = \frac{v_{\text{late}} - v_{\text{early}}}{72}$$
- **Early-to-Late Projection**:
  $$\hat{v}_{168} = v_0 + v_{\text{early}} \times 168$$
- **Future Mission Orbital Operating Life Extrapolation (264h+)**:
  $$\hat{v}_{264} = v_{168} + \max(\text{slope}, v_{\text{late}}) \times 96 + \frac{1}{2} \max(0, a) \times (96)^2$$

If $\hat{v}_{264} > \text{datasheet\_max}$, the component is quarantined for future mission breach risk even if its current 168h value passes static limits.

---

## 4. Multi-Factor Composite Risk Engine (0 - 100)
Risk scores are bounded, monotonic, and reproducible:
$$\text{Risk Score} = \min\left(100, \sum w_i S_i\right)$$

- **Lot Relative Deviation**: $w = 34\%$
- **Future Orbital Drift**: $w = 24\%$
- **Unsupervised Isolation Forest**: $w = 18\%$
- **Breach Probability**: $w = 14\%$
- **Early Trajectory Exceedance**: $w = 10\%$
- **Temperature Stress Factor**: Contextual scalar above 125°C.

### Risk Bands:
- **0 – 29**: LOW (Safe for spaceflight)
- **30 – 59**: MEDIUM (Caution / Continuous telemetry monitoring)
- **60 – 79**: HIGH (Degrading trajectory / Review required)
- **80 – 100**: CRITICAL (Quarantine mandatory / Flight rejection)
