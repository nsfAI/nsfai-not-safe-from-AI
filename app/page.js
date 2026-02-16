"use client";

import { useMemo, useState } from "react";

const TASK_OPTIONS = [
  "Writing emails, documentation, or reports",
  "Summarizing information / research",
  "Data entry / form processing",
  "Spreadsheet reporting / dashboards",
  "Basic analysis (KPIs, trends) with structured data",
  "Customer support / answering FAQs",
  "Scheduling / coordination / operations admin",
  "Designing workflows / SOPs / process improvement",
  "Negotiation / persuasion / sales conversations",
  "Leading meetings / stakeholder management",
  "Hands-on physical work (field, equipment, lab)",
  "Caregiving / high-empathy human interaction",
  "High-stakes decisions / sign-off / liability responsibility",
  "Creative strategy / brand / ambiguous problem solving",
  "Building software / automation / scripting",
];

const INDUSTRIES = [
  "Tech",
  "Finance",
  "Healthcare",
  "Education",
  "Legal",
  "Manufacturing",
  "Retail",
  "Government",
  "Consulting",
  "Media",
  "Real Estate",
  "Other",
];

const SENIORITY = ["Entry", "Junior", "Mid", "Senior / Lead", "Executive"];

export default function Page() {
  // IMPORTANT: start EMPTY so nothing is “pre-filled”
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [seniority, setSeniority] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tasks, setTasks] = useState([]); // empty = none selected

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const selectedCount = tasks.length;

  const canAddMoreTasks = useMemo(() => selectedCount < 8, [selectedCount]);

  function toggleTask(label) {
    setTasks((prev) => {
      const has = prev.includes(label);
      if (has) return prev.filter((t) => t !== label);
      if (prev.length >= 8) return prev; // hard cap
      return [...prev, label];
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setReport(null);

    const jd = jobDescription.trim();
    if (!jd) {
      setError("Job description is required.");
      return;
    }
    if (jd.length < 30) {
      setError("Job description looks too short. Paste the full posting (at least ~30 chars).");
      return;
    }
    if (tasks.length < 3) {
      setError("Pick at least 3 tasks so the analysis is accurate.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          industry,
          seniority,
          jobDescription: jd,
          tasks,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          (typeof data === "string" ? data : null) ||
          `Request failed (${res.status})`;
        setError(msg);
        return;
      }

      setReport(data);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setJobTitle("");
    setIndustry("");
    setSeniority("");
    setJobDescription("");
    setTasks([]);
    setError("");
    setReport(null);
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">NSFAI — Not Safe From AI</h1>
            <p className="mt-1 text-sm text-neutral-600">
              AI displacement risk for any role (based on your actual tasks, not just title).
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetAll}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              Reset
            </button>
            <a
              href="#report"
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Jump to report
            </a>
          </div>
        </div>

        {/* Form card */}
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Top row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="text-sm font-semibold">Job title (optional)</label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Investment Banker"
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-semibold">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="">Select…</option>
                  {INDUSTRIES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-semibold">Seniority</label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="">Select…</option>
                  {SENIORITY.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Job description */}
            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-semibold">Paste job description (required)</label>
                <span className="text-xs text-neutral-500">{jobDescription.trim().length} chars</span>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={7}
                className="mt-2 w-full resize-y rounded-xl border border-neutral-300 px-3 py-2 text-sm leading-6 outline-none focus:border-neutral-900"
              />
            </div>

            {/* Tasks */}
            <div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Tasks you actually do <span className="text-neutral-500">(pick 3–8)</span>
                  </p>
                  <p className="text-xs text-neutral-600">
                    This matters more than title. Pick what you do weekly.
                  </p>
                </div>
                <div className="text-xs font-medium text-neutral-700">
                  Selected: <span className="font-bold">{selectedCount}</span> / 8
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TASK_OPTIONS.map((label) => {
                  const checked = tasks.includes(label);
                  const disabled = !checked && !canAddMoreTasks;

                  return (
                    <label
                      key={label}
                      className={[
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm",
                        checked ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white",
                        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-neutral-400",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleTask(label)}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="leading-5">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Error + CTA */}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={loading}
                className={[
                  "rounded-xl px-5 py-3 text-sm font-semibold text-white",
                  loading ? "bg-neutral-400" : "bg-neutral-900 hover:bg-neutral-800",
                ].join(" ")}
              >
                {loading ? "Generating…" : "Generate NSFAI Report"}
              </button>

              <p className="text-xs text-neutral-600">
                Tip: If you hit <span className="font-medium">Rate limit</span>, wait ~20–60 seconds and try again.
              </p>
            </div>
          </form>
        </div>

        {/* Report */}
        <div id="report" className="mt-6">
          {report ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">NSFAI Report</h2>
                  <p className="text-sm text-neutral-600">
                    {jobTitle ? jobTitle : "Untitled role"}{" "}
                    {industry ? `• ${industry}` : ""} {seniority ? `• ${seniority}` : ""}
                  </p>
                </div>
                {"overall_risk_score" in report ? (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <div className="text-xs text-neutral-600">Overall risk score</div>
                    <div className="text-2xl font-bold">{report.overall_risk_score}/100</div>
                    {report.risk_level ? (
                      <div className="text-xs font-medium text-neutral-700">{report.risk_level}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <pre className="mt-4 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-5">
{JSON.stringify(report, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">
              Your report will show up here after you generate one.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
