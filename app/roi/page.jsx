"use client";

import { useMemo, useState, useEffect } from "react";
import {
  MAJORS,
  CITIES,
  SCHOOL_TYPES,
  LIFESTYLES,
  pickMajor,
  pickCity,
  pickLifestyle,
  resolveAutoTuition,
} from "./benchmarks";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  return `${sign}$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Human capital model:
 * - School years: negative cashflows (tuition + living - scholarship)
 * - Work years: after-tax salary - living after grad - debt service
 * - NPV with discount rate
 * - break-even year
 *
 * Optional training phase (e.g., medicine residency):
 * - trainingYears at trainingSalary, then attendingStartSalary
 */
function runModel({
  yearsInSchool,
  careerHorizon,
  tuitionPerYear,
  livingSchool,
  scholarshipPerYear,
  debtPrincipal,
  debtApr,
  repayYears,
  startSalary,
  salaryGrowth,
  plateauYear,
  plateauGrowth,
  taxRate,
  livingAfterGrad,
  discountRate,
  aiExposure,
  scenario, // "base" | "compression"
  trainingYears = 0,
  trainingSalary = 0,
  attendingStartSalary = null,
}) {
  const YS = clamp(Math.round(yearsInSchool), 0, 12);
  const H = clamp(Math.round(careerHorizon), 1, 60);

  const disc = clamp(discountRate, 0.0, 0.25);
  const tr = clamp(taxRate, 0.0, 0.60);

  const exp = clamp(aiExposure ?? 5, 0, 10);

  // Compression haircut: higher exposure → lower wage growth and earlier plateau
  const compHaircut = scenario === "compression" ? 0.008 + (exp / 10) * 0.02 : 0; // 0.8% .. 2.8%
  const compPlateauPull = scenario === "compression" ? Math.round((exp / 10) * 4) : 0; // up to 4 years earlier

  const g1 = clamp(salaryGrowth - compHaircut, -0.05, 0.20);
  const g2 = clamp(plateauGrowth - compHaircut * 0.6, -0.05, 0.10);
  const pYear = clamp((plateauYear ?? 15) - compPlateauPull, 3, 35);

  // Debt payment (annual) amortization
  const r = clamp(debtApr, 0, 0.35);
  const n = clamp(Math.round(repayYears), 0, 40);

  let annualDebtPay = 0;
  if (debtPrincipal > 0 && n > 0) {
    const i = r; // annual rate
    if (i === 0) annualDebtPay = debtPrincipal / n;
    else annualDebtPay = (debtPrincipal * i) / (1 - Math.pow(1 + i, -n));
  }

  const cashflows = [];

  // School years
  for (let y = 1; y <= YS; y++) {
    const cf = -tuitionPerYear - livingSchool + scholarshipPerYear;
    cashflows.push(cf);
  }

  // Work years
  let salary = startSalary;

  for (let y = 1; y <= H; y++) {
    let gross;

    if (trainingYears > 0 && y <= trainingYears) {
      gross = trainingSalary;
    } else if (attendingStartSalary !== null && attendingStartSalary !== undefined) {
      if (y === trainingYears + 1) salary = attendingStartSalary;
      gross = salary;
    } else {
      gross = salary;
    }

    const afterTax = gross * (1 - tr);
    const debtPay = y <= n ? annualDebtPay : 0;

    const cf = afterTax - livingAfterGrad - debtPay;
    cashflows.push(cf);

    const inTraining = trainingYears > 0 && y <= trainingYears;
    if (!inTraining) {
      if (y < pYear) salary = salary * (1 + g1);
      else salary = salary * (1 + g2);
    }
  }

  // NPV + break-even
  let npv = 0;
  let cum = 0;
  let breakEvenYear = null;

  for (let t = 0; t < cashflows.length; t++) {
    const cf = cashflows[t];
    const pv = cf / Math.pow(1 + disc, t + 1);
    npv += pv;

    cum += cf;
    if (breakEvenYear === null && cum >= 0) breakEvenYear = t + 1;
  }

  return {
    npv,
    breakEvenYear: breakEvenYear ?? "—",
    annualDebtPay,
    cashflows,
    meta: { compHaircut, compPlateauPull, g1, g2, pYear },
  };
}

export default function ROIPage() {
  // Easy Mode selections
  const [majorText, setMajorText] = useState("Accounting");
  const [majorBenchmark, setMajorBenchmark] = useState("Accounting (BS)");
  const [cityKey, setCityKey] = useState("New York, NY");
  const [schoolType, setSchoolType] = useState("Public 4-year (In-State avg)");
  const [lifestyle, setLifestyle] = useState("Normal");

  // Advanced toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Manual inputs (Advanced)
  const [yearsInSchool, setYearsInSchool] = useState(4);
  const [careerHorizon, setCareerHorizon] = useState(30);
  const [tuitionPerYear, setTuitionPerYear] = useState(12000);
  const [livingSchool, setLivingSchool] = useState(20000);
  const [scholarshipPerYear, setScholarshipPerYear] = useState(0);
  const [debtPrincipal, setDebtPrincipal] = useState(0);
  const [debtApr, setDebtApr] = useState(0.065);
  const [repayYears, setRepayYears] = useState(10);
  const [startSalary, setStartSalary] = useState(72000);
  const [salaryGrowth, setSalaryGrowth] = useState(0.045);
  const [taxRate, setTaxRate] = useState(0.24);
  const [livingAfterGrad, setLivingAfterGrad] = useState(36000);
  const [discountRate, setDiscountRate] = useState(0.07);
  const [aiExposure, setAiExposure] = useState(6);

  // Scenario tabs
  const [scenario, setScenario] = useState("base");
  const [ran, setRan] = useState(false);

  /**
   * ✅ SINGLE SOURCE OF TRUTH:
   * Use resolveAutoTuition(major, schoolType) and ALWAYS compute tuition from that.
   * Also expose correctedSchoolTypeKey so we can sync UI state properly.
   */
  const derived = useMemo(() => {
    const major = pickMajor(majorText, majorBenchmark);
    const city = CITIES.find((c) => c.key === cityKey) || CITIES[0];
    const lifestyleObj = pickLifestyle(lifestyle);

    const tuitionResolved = resolveAutoTuition(major, schoolType);
    const effectiveSchoolTypeKey = tuitionResolved.correctedSchoolTypeKey;

    const tuition = tuitionResolved.tuitionPerYear;

    const livingSchoolAuto = Math.round(city.livingSchool * lifestyleObj.livingMult);
    const livingAfterAuto = Math.round(city.livingAfter * lifestyleObj.livingMult);

    const isMed = major.track === "MED";

    // Optional: if you later add training fields into major, this supports them.
    const trainingYears = major.trainingYears || 0;
    const trainingSalaryBase = major.trainingSalary || 0;

    const attendingBase =
      major.attendingStartSalary != null ? major.attendingStartSalary : major.startSalary;

    const attendingStartSalary = isMed ? Math.round(attendingBase * city.salaryMult) : null;
    const trainingSalary = trainingSalaryBase
      ? Math.round(trainingSalaryBase * (city.salaryMult * 0.95))
      : 0;

    // For non-med: start salary is just benchmark * city mult
    const startSalaryAuto = !isMed
      ? Math.round(major.startSalary * city.salaryMult)
      : trainingSalary || Math.round(major.startSalary * city.salaryMult);

    return {
      major,
      city,
      lifestyle: lifestyleObj,
      tuitionResolved,
      effectiveSchoolTypeKey,
      auto: {
        tuitionPerYear: tuition,
        livingSchool: livingSchoolAuto,
        livingAfterGrad: livingAfterAuto,
        yearsInSchool: major.yearsInSchoolDefault || 4,

        startSalary: startSalaryAuto,
        salaryGrowth: major.growth,
        plateauYear: major.plateauYear,
        plateauGrowth: major.plateauGrowth,
        taxRate: city.taxRate,
        aiExposure: major.aiExposure,

        trainingYears,
        trainingSalary,
        attendingStartSalary,
      },
      warnings: {
        correctedSchoolType: effectiveSchoolTypeKey !== schoolType,
      },
    };
  }, [majorText, majorBenchmark, cityKey, schoolType, lifestyle]);

  /**
   * ✅ FIX: actually sync UI schoolType to the corrected key.
   * This is the bug that was keeping MED tuition stuck at UG numbers.
   */
  useEffect(() => {
    if (derived.warnings.correctedSchoolType) {
      setSchoolType(derived.effectiveSchoolTypeKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived.effectiveSchoolTypeKey]);

  const modelInputs = useMemo(() => {
    if (showAdvanced) {
      return {
        yearsInSchool: Number(yearsInSchool),
        careerHorizon: Number(careerHorizon),
        tuitionPerYear: Number(tuitionPerYear),
        livingSchool: Number(livingSchool),
        scholarshipPerYear: Number(scholarshipPerYear),
        debtPrincipal: Number(debtPrincipal),
        debtApr: Number(debtApr),
        repayYears: Number(repayYears),
        startSalary: Number(startSalary),
        salaryGrowth: Number(salaryGrowth),
        plateauYear: derived.major.plateauYear,
        plateauGrowth: derived.major.plateauGrowth,
        taxRate: Number(taxRate),
        livingAfterGrad: Number(livingAfterGrad),
        discountRate: Number(discountRate),
        aiExposure: Number(aiExposure),

        trainingYears: derived.auto.trainingYears || 0,
        trainingSalary: derived.auto.trainingSalary || 0,
        attendingStartSalary: derived.auto.attendingStartSalary,
      };
    }

    return {
      yearsInSchool: derived.auto.yearsInSchool,
      careerHorizon: 30,
      tuitionPerYear: derived.auto.tuitionPerYear,
      livingSchool: derived.auto.livingSchool,
      scholarshipPerYear: 0,

      debtPrincipal: 0,
      debtApr: 0.065,
      repayYears: 10,

      startSalary: derived.auto.startSalary,
      salaryGrowth: derived.auto.salaryGrowth,
      plateauYear: derived.auto.plateauYear,
      plateauGrowth: derived.auto.plateauGrowth,
      taxRate: derived.auto.taxRate,
      livingAfterGrad: derived.auto.livingAfterGrad,
      discountRate: 0.07,
      aiExposure: derived.auto.aiExposure,

      trainingYears: derived.auto.trainingYears || 0,
      trainingSalary: derived.auto.trainingSalary || 0,
      attendingStartSalary: derived.auto.attendingStartSalary,
    };
  }, [
    showAdvanced,
    yearsInSchool,
    careerHorizon,
    tuitionPerYear,
    livingSchool,
    scholarshipPerYear,
    debtPrincipal,
    debtApr,
    repayYears,
    startSalary,
    salaryGrowth,
    taxRate,
    livingAfterGrad,
    discountRate,
    aiExposure,
    derived,
  ]);

  const outputs = useMemo(() => {
    if (!ran) return null;
    return runModel({ ...modelInputs, scenario });
  }, [ran, modelInputs, scenario]);

  const analysis = useMemo(() => {
    if (!outputs) return null;

    const allInSchoolBurn =
      modelInputs.yearsInSchool *
      (modelInputs.tuitionPerYear + modelInputs.livingSchool - modelInputs.scholarshipPerYear);

    const monthlyDebt = outputs.annualDebtPay / 12;

    const comp = outputs.meta;
    const compText =
      scenario === "compression"
        ? `Compression haircut applied: ${pct(comp.compHaircut)} to wage growth; plateau pulled earlier by ${comp.compPlateauPull} year(s).`
        : `Base scenario: no compression haircut applied.`;

    const trainingNote =
      modelInputs.trainingYears > 0
        ? `Training phase modeled: ${modelInputs.trainingYears} year(s) at ${money(modelInputs.trainingSalary)} (annual), then switches to attending salary ${money(modelInputs.attendingStartSalary)}.`
        : `No training phase modeled for this major.`;

    const precisionNote =
      !showAdvanced
        ? `Easy Mode uses benchmark estimates (not your exact school tuition, grants, or debt). Toggle Advanced for precision.`
        : `Advanced mode: you are overriding the benchmark assumptions.`;

    return [
      precisionNote,
      `Education treated as capital allocation: upfront costs during ${modelInputs.yearsInSchool} school-year(s), followed by after-tax cashflows over a ${modelInputs.careerHorizon}-year horizon discounted at ${pct(modelInputs.discountRate)}.`,
      `All-in school burn: ${money(allInSchoolBurn)} (tuition + living − scholarships), excluding opportunity-cost wages while studying.`,
      modelInputs.debtPrincipal > 0
        ? `Debt fragility: modeled monthly payment ${money(monthlyDebt)}. High fixed payments reduce optionality in early career years.`
        : `No debt assumed in this run (toggle Advanced to model debt).`,
      trainingNote,
      compText,
      `AI exposure: ${modelInputs.aiExposure}/10. Higher values reduce the growth slope and pull plateau earlier in the compression scenario.`,
      `Break-even: ${outputs.breakEvenYear === "—" ? "not reached" : `year ${outputs.breakEvenYear}`}.`,
      `Major intelligence notes: ${derived.major.notes}`,
    ];
  }, [outputs, modelInputs, scenario, derived.major.notes, showAdvanced]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-black font-semibold text-white">
            R
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Human Capital Model</div>
            <div className="text-xs text-black/50">
              Tuition vs earnings trajectory — compression-adjusted.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/"
            className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold hover:bg-black/5"
          >
            ← NSFAI Scanner
          </a>
          <a
            href="/compression"
            className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold hover:bg-black/5"
          >
            Compression Index
          </a>

          <button
            onClick={() => setRan(true)}
            className="h-10 rounded-xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90"
          >
            Run Model
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Inputs */}
        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
          <div className="mb-4">
            <div className="text-sm font-semibold">Inputs</div>
            <div className="mt-1 text-sm text-black/60">
              Easy Mode auto-fills tuition, salary, and cost-of-living. Advanced mode lets users override everything.
            </div>
          </div>

          {/* EASY MODE */}
          <div className="rounded-2xl border border-black/5 bg-zinc-50 p-4">
            <div className="text-sm font-semibold">Easy Mode</div>
            <div className="mt-1 text-xs text-black/55">
              Choose 4 things. We auto-calculate the rest. (Benchmark estimates — toggle Advanced for exact inputs.)
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-black/70">Major (free text)</label>
                <input
                  value={majorText}
                  onChange={(e) => setMajorText(e.target.value)}
                  placeholder='e.g., "Accounting", "Computer Science", "Medical School", "Law School"'
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
                />
                <div className="mt-1 text-[11px] text-black/50">
                  Matched major: <b>{derived.major.key}</b> (track: {derived.major.track})
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-black/70">Or select a benchmark</label>
                <select
                  value={majorBenchmark}
                  onChange={(e) => setMajorBenchmark(e.target.value)}
                  className="mt-2 h-[46px] w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/20"
                >
                  {MAJORS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.key}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-black/50">
                  If free text matches a known major, it overrides this.
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-black/70">City</label>
                <select
                  value={cityKey}
                  onChange={(e) => setCityKey(e.target.value)}
                  className="mt-2 h-[46px] w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/20"
                >
                  {CITIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.key}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-black/70">School type</label>
                <select
                  value={schoolType}
                  onChange={(e) => setSchoolType(e.target.value)}
                  className="mt-2 h-[46px] w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/20"
                >
                  {SCHOOL_TYPES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.key}
                    </option>
                  ))}
                </select>
                {derived.warnings.correctedSchoolType ? (
                  <div className="mt-1 text-[11px] text-amber-700">
                    Auto-corrected school tier to match major track.
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-black/70">Lifestyle</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LIFESTYLES.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setLifestyle(l.key)}
                      className={cx(
                        "h-10 rounded-xl border px-3 text-sm font-semibold",
                        lifestyle === l.key
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white hover:bg-black/5"
                      )}
                    >
                      {l.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto preview */}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white p-3">
                <div className="text-xs text-black/50">Auto tuition / year</div>
                <div className="mt-1 text-sm font-semibold">{money(derived.auto.tuitionPerYear)}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-3">
                <div className="text-xs text-black/50">Auto years in school</div>
                <div className="mt-1 text-sm font-semibold">{derived.auto.yearsInSchool}</div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white p-3">
                <div className="text-xs text-black/50">Auto living (after grad)</div>
                <div className="mt-1 text-sm font-semibold">{money(derived.auto.livingAfterGrad)}</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-black/55">
              Loaded benchmark: <b>{derived.major.key}</b> — start salary <b>{money(derived.auto.startSalary)}</b>, growth{" "}
              <b>{pct(derived.auto.salaryGrowth)}</b>, AI exposure <b>{derived.auto.aiExposure}/10</b>.
            </div>
          </div>

          {/* ADVANCED TOGGLE */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold hover:bg-black/5"
            >
              {showAdvanced ? "Hide Advanced manual entry" : "Advanced manual entry"}
            </button>

            {showAdvanced && (
              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                <div className="text-sm font-semibold">Advanced manual entry</div>
                <div className="mt-1 text-xs text-black/55">These override Easy Mode defaults when Advanced is open.</div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Years in school" value={yearsInSchool} onChange={setYearsInSchool} />
                  <Field label="Career horizon (years)" value={careerHorizon} onChange={setCareerHorizon} />
                  <MoneyField label="Tuition per year" value={tuitionPerYear} onChange={setTuitionPerYear} />
                  <MoneyField label="Living per year (school)" value={livingSchool} onChange={setLivingSchool} />
                  <MoneyField label="Scholarship per year" value={scholarshipPerYear} onChange={setScholarshipPerYear} />
                  <MoneyField label="Debt principal" value={debtPrincipal} onChange={setDebtPrincipal} />
                  <RateField label="Debt APR (e.g., 0.065)" value={debtApr} onChange={setDebtApr} />
                  <Field label="Repay years" value={repayYears} onChange={setRepayYears} />
                  <MoneyField label="Starting salary" value={startSalary} onChange={setStartSalary} />
                  <RateField label="Salary growth (e.g., 0.045)" value={salaryGrowth} onChange={setSalaryGrowth} />
                  <RateField label="Tax rate (e.g., 0.24)" value={taxRate} onChange={setTaxRate} />
                  <MoneyField label="Living after grad (annual)" value={livingAfterGrad} onChange={setLivingAfterGrad} />
                  <RateField label="Discount rate (e.g., 0.07)" value={discountRate} onChange={setDiscountRate} />
                  <Field label="AI exposure (0–10)" value={aiExposure} onChange={setAiExposure} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Outputs */}
        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Outputs</div>
              <div className="mt-1 text-sm text-black/60">2 scenarios: Base / Compression-adjusted.</div>
            </div>

            <div className="flex items-center gap-2">
              {["base", "compression"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setScenario(k)}
                  className={cx(
                    "h-9 rounded-xl border px-3 text-sm font-semibold",
                    scenario === k ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-black/5"
                  )}
                >
                  {k === "base" ? "Base" : "Compression"}
                </button>
              ))}
            </div>
          </div>

          {!ran ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-zinc-50 p-6 text-sm text-black/60">
              Click <b>Run Model</b> to generate ROI outputs.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <KPI
                  title="NPV (lifetime)"
                  value={money(outputs?.npv)}
                  sub="Discounted net cashflows after tax, living, and debt service."
                />
                <KPI
                  title="Break-even year"
                  value={outputs?.breakEvenYear === "—" ? "—" : `Year ${outputs?.breakEvenYear}`}
                  sub="First year cumulative cashflows become non-negative."
                />
              </div>

              <div className="mt-4 rounded-2xl border border-black/5 bg-zinc-50 p-4">
                <div className="text-sm font-semibold">NSFAI ROI Analysis</div>
                <div className="mt-1 text-xs text-black/55">
                  Mechanistic interpretation (not vibes): fragility, slope, compression sensitivity, payoff structure.
                </div>

                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-black/80">
                  {(analysis || []).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4">
                <div className="text-xs font-semibold text-black/70">Model inputs used (this run)</div>
                <div className="mt-3 grid gap-2 text-xs text-black/60 md:grid-cols-2">
                  <div>
                    Major: <b>{derived.major.key}</b>
                  </div>
                  <div>
                    Track: <b>{derived.major.track}</b>
                  </div>
                  <div>
                    Tuition/yr: <b>{money(modelInputs.tuitionPerYear)}</b>
                  </div>
                  <div>
                    Years in school: <b>{modelInputs.yearsInSchool}</b>
                  </div>
                  <div>
                    Start salary: <b>{money(modelInputs.startSalary)}</b>
                  </div>
                  <div>
                    Growth: <b>{pct(modelInputs.salaryGrowth)}</b>
                  </div>
                  <div>
                    Living (school): <b>{money(modelInputs.livingSchool)}</b>
                  </div>
                  <div>
                    Living (after): <b>{money(modelInputs.livingAfterGrad)}</b>
                  </div>
                  <div>
                    Tax: <b>{pct(modelInputs.taxRate)}</b>
                  </div>
                  <div>
                    AI exposure: <b>{modelInputs.aiExposure}/10</b>
                  </div>
                  <div>
                    Discount: <b>{pct(modelInputs.discountRate)}</b>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------- small UI helpers ---------- */

function KPI({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4">
      <div className="text-xs text-black/50">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-black/55">{sub}</div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-black/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
      />
    </div>
  );
}

function MoneyField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-black/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
      />
      <div className="mt-1 text-[11px] text-black/45">USD annual unless noted.</div>
    </div>
  );
}

function RateField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-black/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/20"
      />
      <div className="mt-1 text-[11px] text-black/45">Use decimals (0.07 = 7%).</div>
    </div>
  );
}
