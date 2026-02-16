"use client";

import { useMemo, useState } from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  return `${sign}$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pmt(principal, apr, years) {
  const r = apr / 12;
  const n = years * 12;
  if (principal <= 0 || years <= 0) return 0;
  if (apr <= 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// ---- Mock "Major Intelligence" benchmarks (swap to real data later) ----
// Values are directional / demo-grade to keep v1 deterministic + fast.
const MAJOR_BENCHMARKS = [
  {
    key: "computer_science_bs",
    label: "Computer Science (BS)",
    starting: 90000,
    growth: 0.055,
    plateauYear: 14,
    plateauSalary: 185000,
    volatility: "high",
    gradSchool: "low",
    notes: [
      "High variance by company tier and geography.",
      "Strong early-career upside; ceiling depends on leverage (product, infra, AI).",
    ],
  },
  {
    key: "finance_bs",
    label: "Finance (BS)",
    starting: 70000,
    growth: 0.045,
    plateauYear: 16,
    plateauSalary: 150000,
    volatility: "medium",
    gradSchool: "medium",
    notes: [
      "Outcomes split hard by track (IB/PE vs corp fin).",
      "Credential + network effects matter more than raw GPA after first role.",
    ],
  },
  {
    key: "accounting_bs",
    label: "Accounting (BS)",
    starting: 65000,
    growth: 0.038,
    plateauYear: 18,
    plateauSalary: 135000,
    volatility: "low",
    gradSchool: "medium",
    notes: [
      "Stable demand, but task automation hits junior layers first.",
      "Upside is role evolution (advisory, FP&A, controls ownership).",
    ],
  },
  {
    key: "nursing_bs",
    label: "Nursing (BSN)",
    starting: 78000,
    growth: 0.032,
    plateauYear: 20,
    plateauSalary: 125000,
    volatility: "medium",
    gradSchool: "medium",
    notes: [
      "Embodied work + liability keeps the floor strong.",
      "Upside improves with specialization and shift selection.",
    ],
  },
  {
    key: "mechanical_engineering_bs",
    label: "Mechanical Engineering (BS)",
    starting: 76000,
    growth: 0.035,
    plateauYear: 18,
    plateauSalary: 145000,
    volatility: "medium",
    gradSchool: "low",
    notes: [
      "Solid baseline, slower top-end than software.",
      "Defensibility increases with domain expertise + compliance/regulatory.",
    ],
  },
  {
    key: "psychology_ba",
    label: "Psychology (BA)",
    starting: 45000,
    growth: 0.028,
    plateauYear: 22,
    plateauSalary: 82000,
    volatility: "medium",
    gradSchool: "high",
    notes: [
      "Often requires grad school for high-income clinical paths.",
      "Undergrad alone has weaker ROI unless paired with a targeted track.",
    ],
  },
  {
    key: "biology_bs",
    label: "Biology (BS)",
    starting: 52000,
    growth: 0.030,
    plateauYear: 20,
    plateauSalary: 98000,
    volatility: "medium",
    gradSchool: "high",
    notes: [
      "ROI depends heavily on whether it’s a pre-professional pipeline (PA/MD/PhD).",
      "Undergrad alone can be modest unless coupled with specialization.",
    ],
  },
  {
    key: "history_ba",
    label: "History (BA)",
    starting: 42000,
    growth: 0.027,
    plateauYear: 22,
    plateauSalary: 80000,
    volatility: "medium",
    gradSchool: "medium",
    notes: [
      "High ROI only when paired with a monetizable skill stack (law, policy, writing, sales).",
      "Signal is less about major, more about portfolio and track.",
    ],
  },
];

function findBenchmarkByText(text) {
  const q = (text || "").trim().toLowerCase();
  if (!q) return null;

  // simple keyword matching
  const rules = [
    { includes: ["computer", "cs", "software"], key: "computer_science_bs" },
    { includes: ["finance", "investment", "bank"], key: "finance_bs" },
    { includes: ["accounting", "cpa"], key: "accounting_bs" },
    { includes: ["nursing", "bsn", "rn"], key: "nursing_bs" },
    { includes: ["mechanical", "mech"], key: "mechanical_engineering_bs" },
    { includes: ["psych", "psychology"], key: "psychology_ba" },
    { includes: ["biology", "bio", "pre-med"], key: "biology_bs" },
    { includes: ["history"], key: "history_ba" },
  ];

  for (const r of rules) {
    if (r.includes.some((w) => q.includes(w))) {
      return MAJOR_BENCHMARKS.find((m) => m.key === r.key) || null;
    }
  }

  return null;
}

function buildCurve({ horizonYears, start, growth, plateauYear, plateauSalary }) {
  const ys = [];
  let s = start;

  for (let y = 1; y <= horizonYears; y++) {
    if (y <= plateauYear) {
      s = start * Math.pow(1 + growth, y - 1);
    } else {
      // asymptotically approach plateauSalary
      const k = 0.20; // speed to plateau
      s = plateauSalary - (plateauSalary - s) * Math.exp(-k);
    }
    ys.push(s);
  }
  return ys;
}

function npv(rate, cashflows) {
  // cashflows index 0 is year 1
  let v = 0;
  for (let t = 0; t < cashflows.length; t++) {
    v += cashflows[t] / Math.pow(1 + rate, t + 1);
  }
  return v;
}

export default function ROIPage() {
  // Inputs (existing style)
  const [yearsInSchool, setYearsInSchool] = useState(4);
  const [careerHorizon, setCareerHorizon] = useState(30);

  const [tuitionPerYear, setTuitionPerYear] = useState(12000);
  const [livingSchoolPerYear, setLivingSchoolPerYear] = useState(20000);
  const [scholarshipPerYear, setScholarshipPerYear] = useState(2000);

  const [debtPrincipal, setDebtPrincipal] = useState(60000);
  const [debtAPR, setDebtAPR] = useState(0.065);
  const [repayYears, setRepayYears] = useState(10);

  const [startingSalary, setStartingSalary] = useState(72000);
  const [salaryGrowth, setSalaryGrowth] = useState(0.045);

  const [taxRate, setTaxRate] = useState(0.24);
  const [livingAfterGrad, setLivingAfterGrad] = useState(36000);

  const [discountRate, setDiscountRate] = useState(0.07);
  const [aiExposure, setAiExposure] = useState(6);

  // NEW: Major / Degree
  const [majorText, setMajorText] = useState("");
  const [majorKey, setMajorKey] = useState("");

  const selectedBenchmark = useMemo(() => {
    if (majorKey) return MAJOR_BENCHMARKS.find((m) => m.key === majorKey) || null;
    // fall back to text inference if user types
    return findBenchmarkByText(majorText);
  }, [majorKey, majorText]);

  const [ran, setRan] = useState(false);
  const [tab, setTab] = useState("base"); // bull | base | compression

  const ai = clamp(Number(aiExposure) || 0, 0, 10);
  const aiHaircut = useMemo(() => {
    // haircut grows nonlinearly after 5
    const x = ai / 10;
    return 0.02 + 0.10 * Math.pow(Math.max(0, x - 0.45), 1.3); // ~2% to ~12%
  }, [ai]);

  const debtMonthly = useMemo(() => {
    return pmt(Number(debtPrincipal) || 0, Number(debtAPR) || 0, Number(repayYears) || 0);
  }, [debtPrincipal, debtAPR, repayYears]);

  const model = useMemo(() => {
    const ysSchool = clamp(parseInt(yearsInSchool, 10) || 0, 0, 10);
    const horizon = clamp(parseInt(careerHorizon, 10) || 0, 1, 60);

    const tuition = Number(tuitionPerYear) || 0;
    const livingSchool = Number(livingSchoolPerYear) || 0;
    const scholarship = Number(scholarshipPerYear) || 0;

    const startSal = Number(startingSalary) || 0;
    const grow = Number(salaryGrowth) || 0;
    const tax = clamp(Number(taxRate) || 0, 0, 0.6);
    const living = Number(livingAfterGrad) || 0;
    const disc = clamp(Number(discountRate) || 0, 0, 0.30);

    // Opportunity cost model: years in school => earnings = 0 (can evolve later)
    // Year 1..ysSchool: negative cashflow for school costs
    const schoolCF = Array.from({ length: ysSchool }, () => -Math.max(0, tuition + livingSchool - scholarship));

    const workYears = Math.max(0, horizon - ysSchool);

    // Base salary curve (user assumptions)
    const baseSalaries = buildCurve({
      horizonYears: workYears,
      start: startSal,
      growth: grow,
      plateauYear: 18,
      plateauSalary: Math.max(startSal, startSal * 2.2),
    });

    // Benchmark salary curve (major-based)
    const bench = selectedBenchmark;
    const benchSalaries = bench
      ? buildCurve({
          horizonYears: workYears,
          start: bench.starting,
          growth: bench.growth,
          plateauYear: bench.plateauYear,
          plateauSalary: bench.plateauSalary,
        })
      : null;

    // Scenario knobs
    // Bull: +1.5% growth, +8% start
    // Base: as-is
    // Compression: haircut growth and earlier plateau-ish behavior (simplified)
    const bull = {
      startMult: 1.08,
      growthAdd: 0.015,
      aiPenalty: 0,
      label: "Bull",
    };

    const base = {
      startMult: 1.0,
      growthAdd: 0,
      aiPenalty: 0,
      label: "Base",
    };

    const compression = {
      startMult: 0.98,
      growthAdd: -aiHaircut, // AI exposure reduces growth rate
      aiPenalty: aiHaircut,
      label: "Compression-adjusted",
    };

    const scenarios = { bull, base, compression };

    function buildCashflows(scn) {
      const afterTaxIncome = [];
      for (let i = 0; i < baseSalaries.length; i++) {
        const gross = baseSalaries[i] * scn.startMult;
        const g = clamp(grow + scn.growthAdd, -0.20, 0.20);
        // re-apply growth effect on top of curve for simplicity
        const adj = gross * Math.pow(1 + g, i);
        const net = adj * (1 - tax);
        afterTaxIncome.push(net);
      }

      // debt payments start after graduation; we model annual debt cost from monthly PMT
      const annualDebt = debtMonthly * 12;

      const workCF = afterTaxIncome.map((net, i) => {
        const debt = i < clamp(parseInt(repayYears, 10) || 0, 0, 40) ? annualDebt : 0;
        return net - living - debt;
      });

      const cf = [...schoolCF, ...workCF];

      const npvVal = npv(disc, cf);

      // break-even: first year where cumulative cashflow >= 0
      let cum = 0;
      let breakEvenYear = null;
      for (let t = 0; t < cf.length; t++) {
        cum += cf[t];
        if (breakEvenYear === null && cum >= 0) breakEvenYear = t + 1;
      }

      return { cf, npv: npvVal, breakEvenYear, workCF, schoolCF, afterTaxIncome };
    }

    const outBull = buildCashflows(bull);
    const outBase = buildCashflows(base);
    const outComp = buildCashflows(compression);

    // Major gap: benchmark vs user assumptions
    let incomeGap = null;
    if (benchSalaries) {
      const benchNet = benchSalaries.map((s) => s * (1 - tax));
      const userNet = baseSalaries.map((s) => s * (1 - tax));
      const gapAnnual = benchNet.map((b, i) => b - userNet[i]); // + means benchmark > user
      const gapNPV = npv(disc, gapAnnual);
      incomeGap = {
        benchLabel: bench.label,
        gapNPV,
        gapYear1: gapAnnual[0] ?? 0,
        gapYear5: gapAnnual[4] ?? 0,
        gapYear10: gapAnnual[9] ?? 0,
        benchStart: bench.starting,
        userStart: startSal,
      };
    }

    return {
      inputs: { ysSchool, horizon, disc, tax, living, startSal, grow, tuition, livingSchool, scholarship },
      scenarios: { bull: outBull, base: outBase, compression: outComp },
      incomeGap,
      bench,
    };
  }, [
    yearsInSchool,
    careerHorizon,
    tuitionPerYear,
    livingSchoolPerYear,
    scholarshipPerYear,
    debtPrincipal,
    debtAPR,
    repayYears,
    startingSalary,
    salaryGrowth,
    taxRate,
    livingAfterGrad,
    discountRate,
    debtMonthly,
    aiHaircut,
    selectedBenchmark,
  ]);

  const active = useMemo(() => {
    if (tab === "bull") return model.scenarios.bull;
    if (tab === "compression") return model.scenarios.compression;
    return model.scenarios.base;
  }, [tab, model]);

  const analysis = useMemo(() => {
    // “200 IQ analysis” = structured insight bullets derived from inputs + outputs
    const ys = model.inputs.ysSchool;
    const horizon = model.inputs.horizon;
    const debt = Number(debtPrincipal) || 0;
    const disc = model.inputs.disc;

    const npvBase = model.scenarios.base.npv;
    const npvComp = model.scenarios.compression.npv;
    const deltaAI = npvComp - npvBase;

    const beBase = model.scenarios.base.breakEvenYear;
    const beComp = model.scenarios.compression.breakEvenYear;

    const burnSchool = model.scenarios.base.schoolCF.reduce((a, b) => a + b, 0);

    const gap = model.incomeGap;

    const bullets = [];

    bullets.push(
      `This model treats education as a capital investment: upfront costs during ${ys} school-year(s), followed by after-tax cashflows over a ${horizon}-year horizon discounted at ${fmtPct(disc)}.`
    );

    bullets.push(
      `Your estimated all-in school burn is ${fmtMoney(Math.abs(burnSchool))} (tuition + living - scholarships), excluding opportunity-cost wages while studying.`
    );

    if (debt > 0) {
      bullets.push(
        `Debt increases fragility: your modeled monthly payment is ${fmtMoney(debtMonthly)}. High fixed payments reduce optionality in early career years.`
      );
    } else {
      bullets.push(`No debt modeled. That increases optionality and improves downside resilience.`);
    }

    bullets.push(
      `Compression-adjusted scenario applies an AI-exposure haircut of ~${fmtPct(aiHaircut)} to wage growth, reflecting “non-expansion” dynamics (fewer seats, higher output-per-head).`
    );

    bullets.push(
      `AI impact on NPV: ${fmtMoney(deltaAI)} vs Base (negative means compression reduces lifetime value).`
    );

    if (beBase) bullets.push(`Break-even (Base): year ${beBase}.`);
    else bullets.push(`Break-even (Base): not reached within horizon (cashflows stay net-negative).`);

    if (beComp) bullets.push(`Break-even (Compression): year ${beComp}.`);
    else bullets.push(`Break-even (Compression): not reached within horizon.`);

    if (gap) {
      const direction = gap.gapNPV > 0 ? "above" : "below";
      bullets.push(
        `Major benchmark (${gap.benchLabel}) implies your assumed salary path is ${direction} a reference curve by NPV ${fmtMoney(gap.gapNPV)}. Year-1 gap: ${fmtMoney(gap.gapYear1)}. Year-10 gap: ${fmtMoney(gap.gapYear10)}.`
      );
    } else {
      bullets.push(
        `No major benchmark selected. Add a major to compute a reference income curve and quantify the gap between tuition burn and expected earnings path.`
      );
    }

    // Major notes
    if (model.bench?.notes?.length) {
      bullets.push(`Major intelligence notes: ${model.bench.notes.join(" ")}`);
    }

    // Decision logic / recommendation style
    const stressFlag =
      (debtMonthly * 12) / Math.max(1, (Number(startingSalary) || 1) * (1 - (Number(taxRate) || 0))) > 0.18;

    if (stressFlag) {
      bullets.push(
        `Risk flag: debt service is heavy relative to after-tax starting income. If early career is disrupted, the first failure mode is not “low salary” — it’s liquidity pressure.`
      );
    }

    return bullets;
  }, [model, debtPrincipal, debtMonthly, startingSalary, taxRate, aiHaircut]);

  function run() {
    setRan(true);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.06),transparent_60%)]">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-black font-semibold text-white">
              R
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Human Capital Model</div>
              <div className="text-xs text-neutral-500">
                Tuition vs earnings trajectory — compression-adjusted.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-50"
            >
              ← NSFAI Scanner
            </a>

            <a
              href="/compression"
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-50"
            >
              Compression Index
            </a>

            <button
              onClick={run}
              className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90"
            >
              Run Model
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="mb-4">
              <div className="text-sm font-semibold">Inputs</div>
              <div className="mt-1 text-sm text-neutral-500">
                This models education as a capital allocation decision under AI compression.
              </div>
            </div>

            {/* NEW: Major / Degree */}
            <div className="mb-6 rounded-2xl border border-black/5 bg-neutral-50 p-4">
              <div className="text-sm font-semibold">Major / Degree (Major Intelligence)</div>
              <div className="mt-1 text-xs text-neutral-600">
                Type your major (e.g., “Computer Science”, “Finance”, “Nursing”) or select one.
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Major (free text)</label>
                  <input
                    value={majorText}
                    onChange={(e) => {
                      setMajorText(e.target.value);
                      setMajorKey(""); // let text inference work
                    }}
                    placeholder="e.g., Computer Science, Finance, Nursing"
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Or select a benchmark</label>
                  <select
                    value={majorKey}
                    onChange={(e) => setMajorKey(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                  >
                    <option value="">(Auto-detect from text)</option>
                    {MAJOR_BENCHMARKS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 text-xs text-neutral-600">
                {selectedBenchmark ? (
                  <>
                    Benchmark loaded: <span className="font-semibold text-neutral-900">{selectedBenchmark.label}</span>{" "}
                    (start {fmtMoney(selectedBenchmark.starting)}, growth {fmtPct(selectedBenchmark.growth)}, plateau ~year{" "}
                    {selectedBenchmark.plateauYear}).
                  </>
                ) : (
                  <>No benchmark matched yet. You can still run the model, but “income gap” will be disabled.</>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Years in school</label>
                <input
                  type="number"
                  value={yearsInSchool}
                  onChange={(e) => setYearsInSchool(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Career horizon (years)</label>
                <input
                  type="number"
                  value={careerHorizon}
                  onChange={(e) => setCareerHorizon(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tuition per year</label>
                <input
                  type="number"
                  value={tuitionPerYear}
                  onChange={(e) => setTuitionPerYear(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                <div className="mt-1 text-xs text-neutral-500">USD annual unless noted.</div>
              </div>

              <div>
                <label className="text-sm font-medium">Living per year (school)</label>
                <input
                  type="number"
                  value={livingSchoolPerYear}
                  onChange={(e) => setLivingSchoolPerYear(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                <div className="mt-1 text-xs text-neutral-500">USD annual unless noted.</div>
              </div>

              <div>
                <label className="text-sm font-medium">Scholarship per year</label>
                <input
                  type="number"
                  value={scholarshipPerYear}
                  onChange={(e) => setScholarshipPerYear(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                <div className="mt-1 text-xs text-neutral-500">USD annual unless noted.</div>
              </div>

              <div>
                <label className="text-sm font-medium">Debt principal</label>
                <input
                  type="number"
                  value={debtPrincipal}
                  onChange={(e) => setDebtPrincipal(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                <div className="mt-1 text-xs text-neutral-500">USD annual unless noted.</div>
              </div>

              <div>
                <label className="text-sm font-medium">Debt APR (e.g., 0.065)</label>
                <input
                  value={debtAPR}
                  onChange={(e) => setDebtAPR(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Repay years</label>
                <input
                  type="number"
                  value={repayYears}
                  onChange={(e) => setRepayYears(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Starting salary</label>
                <input
                  type="number"
                  value={startingSalary}
                  onChange={(e) => setStartingSalary(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                <div className="mt-1 text-xs text-neutral-500">USD annual unless noted.</div>
              </div>

              <div>
                <label className="text-sm font-medium">Salary growth (e.g., 0.045)</label>
                <input
                  value={salaryGrowth}
                  onChange={(e) => setSalaryGrowth(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tax rate (e.g., 0.24)</label>
                <input
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Living after grad (annual)</label>
                <input
                  type="number"
                  value={livingAfterGrad}
                  onChange={(e) => setLivingAfterGrad(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                <div className="mt-1 text-xs text-neutral-500">USD annual unless noted.</div>
              </div>

              <div>
                <label className="text-sm font-medium">Discount rate (e.g., 0.07)</label>
                <input
                  value={discountRate}
                  onChange={(e) => setDiscountRate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">AI exposure (0–10)</label>
                <input
                  type="number"
                  value={aiExposure}
                  onChange={(e) => setAiExposure(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-black/5 bg-neutral-50 p-4 text-sm text-neutral-700">
              <b>Tip:</b> Use your NSFAI Scanner score as <b>AI exposure</b>. Higher score increases disruption probability,
              haircuts wage growth, and pulls plateau earlier.
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              Note: Major benchmarks are demo-grade “mock structured” values until you wire real datasets.
            </div>
          </section>

          {/* Outputs */}
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Outputs</div>
                <div className="mt-1 text-sm text-neutral-500">
                  3 scenarios: Bull / Base / Compression-adjusted.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab("bull")}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm font-semibold",
                    tab === "bull" ? "bg-black text-white border-black" : "bg-white border-black/10 hover:bg-neutral-50"
                  )}
                >
                  Bull
                </button>
                <button
                  onClick={() => setTab("base")}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm font-semibold",
                    tab === "base" ? "bg-black text-white border-black" : "bg-white border-black/10 hover:bg-neutral-50"
                  )}
                >
                  Base
                </button>
                <button
                  onClick={() => setTab("compression")}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm font-semibold",
                    tab === "compression" ? "bg-black text-white border-black" : "bg-white border-black/10 hover:bg-neutral-50"
                  )}
                >
                  Compression
                </button>
              </div>
            </div>

            {!ran ? (
              <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-neutral-50 p-6 text-sm text-neutral-600">
                Run the model to generate ROI outputs.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-black/5 bg-white p-4">
                    <div className="text-xs text-neutral-500">NPV (lifetime)</div>
                    <div className="mt-2 text-2xl font-semibold">{fmtMoney(active.npv)}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Discounted net cashflows after tax, living, and debt service.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-white p-4">
                    <div className="text-xs text-neutral-500">Break-even year</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {active.breakEvenYear ? `Year ${active.breakEvenYear}` : "Not reached"}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      First year cumulative cashflows become non-negative.
                    </div>
                  </div>
                </div>

                {/* NEW: Income gap vs major benchmark */}
                <div className="rounded-2xl border border-black/5 bg-neutral-50 p-4">
                  <div className="text-sm font-semibold">Major benchmark income gap</div>
                  <div className="mt-1 text-xs text-neutral-600">
                    Compares your assumed earnings path vs the major’s benchmark curve (after-tax).
                  </div>

                  {model.incomeGap ? (
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-black/5 bg-white p-4">
                        <div className="text-xs text-neutral-500">Gap NPV</div>
                        <div className="mt-2 text-xl font-semibold">{fmtMoney(model.incomeGap.gapNPV)}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          Positive = benchmark suggests higher earnings than your assumptions.
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/5 bg-white p-4">
                        <div className="text-xs text-neutral-500">Key year gaps</div>
                        <div className="mt-2 text-sm text-neutral-800">
                          Year 1: <b>{fmtMoney(model.incomeGap.gapYear1)}</b>
                          <br />
                          Year 5: <b>{fmtMoney(model.incomeGap.gapYear5)}</b>
                          <br />
                          Year 10: <b>{fmtMoney(model.incomeGap.gapYear10)}</b>
                        </div>
                        <div className="mt-2 text-xs text-neutral-500">
                          This helps detect whether your salary input is conservative or aggressive for that major.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-black/10 bg-white p-4 text-sm text-neutral-600">
                      Add a major (or select a benchmark) to compute the income gap.
                    </div>
                  )}
                </div>

                {/* 200 IQ analysis */}
                <div className="rounded-2xl border border-black/5 bg-white p-4">
                  <div className="text-sm font-semibold">200 IQ analysis</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Mechanistic interpretation (not vibes): fragility, slope, compression sensitivity, and payoff structure.
                  </div>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-800">
                    {analysis.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
