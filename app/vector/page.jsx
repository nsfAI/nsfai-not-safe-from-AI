// app/vector/page.jsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TASK_KEYS } from "../../lib/vector/roles";

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

const TASK_LABELS = {
  analysis: "Structured analysis (KPIs, forecasting, diagnosis)",
  writing: "Writing / documentation / reporting",
  data_ops: "Data ops (cleanup, entry, process handling)",
  dashboards: "Dashboards / BI / reporting systems",
  customer_support: "Customer support / frontline responses",
  coordination: "Scheduling / coordination / ops admin",
  process_design: "Workflow design / SOPs / process improvement",
  sales_negotiation: "Sales / negotiation / persuasion",
  stakeholder_mgmt: "Stakeholder management / leading meetings",
  physical_ops: "Hands-on physical ops (field, equipment, lab)",
  caregiving: "Caregiving / high-empathy human interaction",
  high_stakes_liability: "High-stakes sign-off / liability",
  creative_strategy: "Creative strategy / ambiguous problem solving",
  coding_automation: "Coding / automation / scripting",
  compliance_regulatory: "Compliance / regulated work",
};

const SECTORS = ["Tech", "Healthcare", "Finance", "Education", "Legal", "Government", "Manufacturing", "Construction", "Retail", "Other"];
const SENIORITY = ["Entry", "Mid", "Senior", "Manager", "Director", "Executive"];

function pct(n) {
  const x = Math.max(0, Math.min(100, Number(n || 0)));
  return Math.round(x);
}

function ScoreBar({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/20 dark:bg-[#141414]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-black dark:text-white">{label}</div>
          {hint ? <div className="mt-1 text-xs text-black/60 dark:text-white/60">{hint}</div> : null}
        </div>
        <div className="text-sm font-semibold text-black dark:text-white">{pct(value)}</div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-black/10 dark:bg-white/10">
        <div className="h-2 rounded-full bg-black dark:bg-white" style={{ width: `${pct(value)}%` }} />
      </div>
    </div>
  );
}

export default function VectorPage() {
  const [step, setStep] = useState(1);

  // Step 1: profile
  const [seniority, setSeniority] = useState("Mid");
  const [skillsText, setSkillsText] = useState("excel, forecasting, accounting, stakeholder management");
  const [acceptableSectors, setAcceptableSectors] = useState(["Finance", "Healthcare"]);
  const [avoidSectors, setAvoidSectors] = useState([]);

  // Step 2: task weights
  const [taskWeights, setTaskWeights] = useState(() => {
    const init = {};
    for (const k of TASK_KEYS) init[k] = 0;
    // sane defaults
    init.analysis = 6;
    init.writing = 3;
    init.stakeholder_mgmt = 4;
    init.dashboards = 2;
    return init;
  });

  // Step 3: constraints
  const [salaryMin, setSalaryMin] = useState(90000);
  const [salaryMax, setSalaryMax] = useState(150000);
  const [timeline, setTimeline] = useState("6-12 months");
  const [retrainWillingness, setRetrainWillingness] = useState(0.6);
  const [stabilityVsUpside, setStabilityVsUpside] = useState(0.65);

  // Results
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");

  const skills = useMemo(() => {
    return skillsText
      .split(/[,;\n]/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
  }, [skillsText]);

  const taskSum = useMemo(() => Object.values(taskWeights).reduce((a, b) => a + Number(b || 0), 0), [taskWeights]);

  async function runVector() {
    setLoading(true);
    setError("");
    setRecs([]);
    setActiveRole(null);
    setListings([]);

    try {
      const res = await fetch("/api/vector/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seniority,
          skills,
          acceptableSectors,
          avoidSectors,
          taskWeights,
          stabilityVsUpside,
          constraints: {
            salaryMin,
            salaryMax,
            timeline,
            retrainWillingness,
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!data?.ok) throw new Error(data?.error || "Vector failed.");

      const out = Array.isArray(data.recommendations) ? data.recommendations : [];
      setRecs(out);
      setStep(4);
      if (out.length) {
        setActiveRole(out[0]);
        await loadListings(out[0]);
      }
    } catch (e) {
      setError(e?.message || "Vector failed.");
    } finally {
      setLoading(false);
    }
  }

  async function loadListings(role) {
    try {
      setListings([]);
      const title = role?.title || "";
      if (!title) return;

      const res = await fetch(`/api/vector/listings?title=${encodeURIComponent(title)}&limit=10`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!data?.ok) return;
      setListings(Array.isArray(data.results) ? data.results : []);
    } catch {
      setListings([]);
    }
  }

  function toggleFromList(v, value) {
    const set = new Set(v);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return Array.from(set);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">NSFAI Vector</div>
          <h1 className="text-3xl font-extrabold text-black dark:text-white">
            Compression-aware career positioning
          </h1>
          <div className="mt-2 text-sm text-black/60 dark:text-white/60">
            Not “what you qualify for.” Vector routes you toward roles that fit your task vector while maximizing durability under labor compression.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414] dark:hover:bg-white/10">
            Home
          </Link>
          <Link href="/jobs" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414] dark:hover:bg-white/10">
            Jobs
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-black/10 bg-white p-6 dark:border-white/20 dark:bg-[#141414]">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setStep(n)}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-semibold",
                step === n ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/10 text-black/70 dark:border-white/20 dark:text-white/70"
              )}
            >
              {n === 4 ? "Results" : `Step ${n}`}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/20 dark:bg-[#141414]">
              <div className="text-sm font-semibold text-black dark:text-white">Profile intake</div>
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                Keep it structured. Vector uses this to compute fit and friction.
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-black dark:text-white">Seniority</label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/20 dark:bg-[#141414]"
                >
                  {SENIORITY.map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-black dark:text-white">Skills (comma-separated)</label>
                <textarea
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/20 dark:bg-[#141414]"
                  placeholder="excel, sql, forecasting, audit, stakeholder management…"
                />
                <div className="mt-2 text-xs text-black/50 dark:text-white/50">
                  Parsed skills: {skills.slice(0, 12).join(", ")}{skills.length > 12 ? "…" : ""}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/20 dark:bg-[#141414]">
              <div className="text-sm font-semibold text-black dark:text-white">Sector constraints</div>
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                Acceptable sectors act as a filter. Avoid sectors are hard exclusions.
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-black dark:text-white">Acceptable sectors</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SECTORS.map((s) => {
                    const on = acceptableSectors.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => setAcceptableSectors((prev) => toggleFromList(prev, s))}
                        className={cx(
                          "rounded-full px-3 py-2 text-xs",
                          on ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/10 text-black/70 dark:border-white/20 dark:text-white/70"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-medium text-black dark:text-white">Avoid sectors</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SECTORS.map((s) => {
                    const on = avoidSectors.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => setAvoidSectors((prev) => toggleFromList(prev, s))}
                        className={cx(
                          "rounded-full px-3 py-2 text-xs",
                          on ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/10 text-black/70 dark:border-white/20 dark:text-white/70"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 dark:bg-white dark:text-black"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="mt-6">
            <div className="text-sm font-semibold text-black dark:text-white">Task & skill mapping</div>
            <div className="mt-1 text-sm text-black/60 dark:text-white/60">
              Confirm your weekly task vector. Weights are “time share” (hours or points). Total weight: {taskSum}.
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {TASK_KEYS.map((k) => (
                <div key={k} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/20 dark:bg-[#141414]">
                  <div className="text-sm font-semibold text-black dark:text-white">{TASK_LABELS[k] || k}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={Number(taskWeights[k] || 0)}
                      onChange={(e) => setTaskWeights((prev) => ({ ...prev, [k]: Number(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="w-10 text-right text-sm font-semibold text-black dark:text-white">
                      {Number(taskWeights[k] || 0)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-black/50 dark:text-white/50">
                    Higher weight = bigger share of your week.
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414]"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 dark:bg-white dark:text-black"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/20 dark:bg-[#141414]">
              <div className="text-sm font-semibold text-black dark:text-white">Goal constraints</div>
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                These are hard filters + weight tuners.
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-black dark:text-white">Salary min</label>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-[#141414]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-black dark:text-white">Salary max</label>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/20 dark:bg-[#141414]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-black dark:text-white">Timeline</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm dark:border-white/20 dark:bg-[#141414]"
                >
                  <option>0-3 months</option>
                  <option>3-6 months</option>
                  <option>6-12 months</option>
                  <option>12+ months</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-black dark:text-white">Retrain willingness</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={retrainWillingness}
                    onChange={(e) => setRetrainWillingness(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-10 text-right text-sm font-semibold text-black dark:text-white">
                    {Math.round(retrainWillingness * 100)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-black dark:text-white">Stability vs upside</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={stabilityVsUpside}
                    onChange={(e) => setStabilityVsUpside(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-10 text-right text-sm font-semibold text-black dark:text-white">
                    {Math.round(stabilityVsUpside * 100)}
                  </div>
                </div>
                <div className="mt-2 text-xs text-black/50 dark:text-white/50">
                  Higher = prioritize resilience + ease. Lower = prioritize economics/upside.
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414]"
                >
                  ← Back
                </button>

                <button
                  onClick={runVector}
                  disabled={loading}
                  className={cx(
                    "rounded-xl px-4 py-2 text-sm font-semibold",
                    "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black",
                    loading ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {loading ? "Routing…" : "Generate portfolio →"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-5 text-sm text-black/80 dark:border-white/20 dark:bg-black/20 dark:text-white/80">
              <div className="text-sm font-semibold">What Vector returns</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>5–10 role portfolio ranked by Fit × Resilience × Economics × Ease</li>
                <li>Explainable drivers + skill gaps</li>
                <li>Transition plan (3–5 concrete steps)</li>
                <li>Live listings mapped to each role</li>
              </ul>
              <div className="mt-3 text-xs text-black/60 dark:text-white/60">
                V1 uses a seeded role ontology (expandable). Next upgrade is ingesting O*NET/BLS and scoring overlays.
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {step === 4 && (
          <div className="mt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-black dark:text-white">Results cockpit</div>
                <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                  Portfolio of roles to reallocate toward under compression.
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414]"
              >
                New run
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* left: portfolio list */}
              <div className="space-y-3 lg:col-span-1">
                {recs.map((r) => (
                  <button
                    key={r.role_id}
                    onClick={async () => {
                      setActiveRole(r);
                      await loadListings(r);
                    }}
                    className={cx(
                      "w-full rounded-2xl border p-4 text-left",
                      activeRole?.role_id === r.role_id
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-black/10 bg-white hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414] dark:hover:bg-white/10"
                    )}
                  >
                    <div className="text-sm font-semibold">{r.title}</div>
                    <div className={cx("mt-1 text-xs", activeRole?.role_id === r.role_id ? "text-white/80 dark:text-black/80" : "text-black/60 dark:text-white/60")}>
                      {r.sector} • Final {r.final}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={cx("rounded-full px-2 py-1", activeRole?.role_id === r.role_id ? "bg-white/15 dark:bg-black/10" : "border border-black/10 dark:border-white/20")}>
                        Fit {r.fit}
                      </span>
                      <span className={cx("rounded-full px-2 py-1", activeRole?.role_id === r.role_id ? "bg-white/15 dark:bg-black/10" : "border border-black/10 dark:border-white/20")}>
                        Res {r.resilience}
                      </span>
                      <span className={cx("rounded-full px-2 py-1", activeRole?.role_id === r.role_id ? "bg-white/15 dark:bg-black/10" : "border border-black/10 dark:border-white/20")}>
                        Econ {r.economics}
                      </span>
                      <span className={cx("rounded-full px-2 py-1", activeRole?.role_id === r.role_id ? "bg-white/15 dark:bg-black/10" : "border border-black/10 dark:border-white/20")}>
                        Ease {r.ease}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* right: active role cockpit */}
              <div className="rounded-3xl border border-black/10 bg-white p-6 dark:border-white/20 dark:bg-[#141414] lg:col-span-2">
                {!activeRole ? (
                  <div className="text-sm text-black/60 dark:text-white/60">Select a role to view details.</div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-2xl font-extrabold text-black dark:text-white">{activeRole.title}</div>
                        <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                          {activeRole.sector} • {activeRole.transition_difficulty} difficulty • {activeRole.time_to_transition}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-black/50 dark:text-white/50">Income range</div>
                        <div className="text-sm font-semibold text-black dark:text-white">
                          ${(activeRole.income?.low || 0).toLocaleString()}–${(activeRole.income?.high || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <ScoreBar label="Fit score" value={activeRole.fit} hint="Task overlap + skills + seniority alignment." />
                      <ScoreBar label="Compression resilience" value={activeRole.resilience} hint="Exposure baseline + structural dampeners − compression overlay." />
                      <ScoreBar label="Economics" value={activeRole.economics} hint="Income band overlap vs your target." />
                      <ScoreBar label="Ease" value={activeRole.ease} hint="Skill gap severity × timeline × retrain tolerance." />
                    </div>

                    <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-5 text-sm text-black/80 dark:border-white/20 dark:bg-black/20 dark:text-white/80">
                      <div className="font-semibold">Why this role</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {(activeRole.why || []).map((x, i) => <li key={i}>{x}</li>)}
                      </ul>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/20 dark:bg-[#141414]">
                        <div className="text-sm font-semibold text-black dark:text-white">Skill gaps</div>
                        <div className="mt-2 space-y-2 text-sm">
                          {(activeRole.skill_gaps || []).length ? (
                            activeRole.skill_gaps.map((g) => (
                              <div key={g.name} className="flex items-center justify-between">
                                <span className="text-black/80 dark:text-white/80">{g.name}</span>
                                <span className={cx("text-xs font-semibold", g.critical ? "text-red-600" : "text-black/50 dark:text-white/50")}>
                                  {g.critical ? "Critical" : "Optional"}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-black/60 dark:text-white/60">No major gaps detected (V1).</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/20 dark:bg-[#141414]">
                        <div className="text-sm font-semibold text-black dark:text-white">What to do next</div>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-black/80 dark:text-white/80">
                          {(activeRole.plan || []).map((x, i) => <li key={i}>{x}</li>)}
                        </ol>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/20 dark:bg-[#141414]">
                      <div className="text-sm font-semibold text-black dark:text-white">Live listings</div>
                      <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                        Pulled from your Jobs index using the role title query (V1).
                      </div>

                      <div className="mt-4 space-y-3">
                        {!listings.length ? (
                          <div className="text-sm text-black/60 dark:text-white/60">No listings found yet.</div>
                        ) : (
                          listings.map((j) => (
                            <a
                              key={j.id}
                              href={j.url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-2xl border border-black/10 bg-white p-4 hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414] dark:hover:bg-white/10"
                            >
                              <div className="text-sm font-semibold text-black dark:text-white">{j.title}</div>
                              <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                                {j.company}{j.location ? ` — ${j.location}` : ""}
                              </div>
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-black/50 dark:text-white/50">
        Disclosure: Vector outputs are model estimates and routing suggestions, not guarantees. V1 uses a seeded ontology; replace/expand with O*NET/BLS ingestion next.
      </div>
    </div>
  );
}
