/* ============================================================
   ANL — data.js  |  1,000-record Synthetic Customer Dataset
   Fields: CustomerID, Gender, Age, AnnualIncome (k$),
           SpendingScore (1-100), CreditScore (300-900)
   Clusters: Careless · Spendthrift · Sensible · Careful · Target
   ============================================================ */
(function () {
  'use strict';

  /* ── Seeded PRNG (Mulberry32) for reproducible dataset ── */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(2025);

  /* ── Helpers ── */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const gauss = (mu, sd) => {
    const u1 = Math.max(rng(), 1e-9), u2 = rng();
    return mu + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  /* ── Cluster Definitions ──
     id  name         income(k$)    spending(1-100)   weight
     0   Careless      low           high              20 %  → High Risk
     1   Spendthrift   low           low               15 %  → Medium Risk
     2   Sensible      mid           mid               30 %  → Medium Risk
     3   Careful       high          low               17 %  → Low Risk
     4   Target        high          high              18 %  → Low Risk   */
  const CLUSTERS = [
    { id: 0, name: 'Careless', iMu: 30, iSd: 8, sMu: 72, sSd: 10, w: 0.20 },
    { id: 1, name: 'Spendthrift', iMu: 33, iSd: 9, sMu: 28, sSd: 10, w: 0.15 },
    { id: 2, name: 'Sensible', iMu: 58, iSd: 13, sMu: 48, sSd: 13, w: 0.30 },
    { id: 3, name: 'Careful', iMu: 88, iSd: 14, sMu: 22, sSd: 8, w: 0.17 },
    { id: 4, name: 'Target', iMu: 92, iSd: 15, sMu: 78, sSd: 10, w: 0.18 },
  ];

  function pickCluster() {
    let r = rng(), cum = 0;
    for (const c of CLUSTERS) { cum += c.w; if (r < cum) return c; }
    return CLUSTERS[CLUSTERS.length - 1];
  }

  /* ── Risk Level — single source of truth ── */
  function calcRiskLevel(income, spending) {
    if (spending >= 58 && income < 45) return 'High Risk';
    if (income >= 68 && (spending < 42 || spending >= 60)) return 'Low Risk';
    return 'Medium Risk';
  }

  /* ── Credit Score (300–900) ──
     Weighted composite: income 50%, inverse-spending 30%, age 20%
     Gaussian noise ±18 pts for realism                         */
  function calcCreditScore(income, spending, age) {
    const iN = clamp((income - 15) / 125, 0, 1);   // normalise income  15–140
    const sN = clamp((100 - spending) / 99, 0, 1);   // low spending → better score
    const aN = clamp((age - 18) / 52, 0, 1);   // normalise age 18–70
    const raw = 300 + (iN * 0.50 + sN * 0.30 + aN * 0.20) * 600;
    return Math.round(clamp(raw + gauss(0, 18), 300, 900));
  }

  /* ── Generate 1,000 unique records ── */
  const customers = [];
  for (let id = 1; id <= 1000; id++) {
    const cl = pickCluster();
    const gender = rng() < 0.5 ? 'Male' : 'Female';
    const age = randInt(18, 70);
    const income = Math.round(clamp(gauss(cl.iMu, cl.iSd), 15, 140));
    const spending = Math.round(clamp(gauss(cl.sMu, cl.sSd), 1, 100));
    customers.push({
      /* Standard API fields */
      CustomerID: id,
      Gender: gender,
      Age: age,
      AnnualIncome: income,       // in k$ (thousands)
      SpendingScore: spending,    // 1–100
      CreditScore: calcCreditScore(income, spending, age), // 300–900

      /* Camel-case aliases — used throughout app.js */
      id,
      gender,
      age,
      annualIncome: income,
      spendingScore: spending,
      creditScore: calcCreditScore(income, spending, age),

      /* Cluster metadata */
      cluster: cl.id,
      clusterLabel: cl.name,
      riskLevel: calcRiskLevel(income, spending),
    });
  }

  /* ── Expose globals ── */
  window.ANL_DATA = customers;   // primary reference
  window.customersData = customers;   // legacy alias
  window.ANL_calcRisk = calcRiskLevel;
  window.ANL_calcCredit = calcCreditScore;
})();
