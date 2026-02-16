"use client";

import { useMemo, useState } from "react";

function Pill({ active, children }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        active
          ? "bg-zinc-900 text-white"
          : "bg-white/70 text-zinc-700 ring-1 ring-zinc-200 hover:bg-white",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Card({ title, subtitle, children, right }) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-zinc-200 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function Home() {
  const tasks = useMemo(
    () => [
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
    ],
    []
  );

  const industries = ["Finance", "Healthcare", "Tech", "Education", "Operations", "Other"];
  const seniorities = ["Entry", "Mid", "Senior", "Manager", "Executive"];

  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [seniority, setSeniority] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const toggleTask = (t) => {
    setSelectedTasks((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= 8) return prev; // hard cap
      return [...prev, t];
    });
  };

  const canGenerate =
    jobDesc.trim().length > 0 &&
    selectedTasks.length >= 3 &&
    selectedTasks.length <= 8 &&
    !loading;

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    setReport(null);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          industry,
          seniority,
          jobDesc,
          tasks: selectedTasks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate report");

      setReport(data);
      document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setJobTitle("");
    setIndustry("");
    setSeniority("");
    setJobDesc("");
    setSelectedTasks([]);
    setReport(null);
    setError("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 text-zinc-900">
      {/* top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.08),transparent_60%)]" />

      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 text-white shadow-sm">
              N
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">NSFAI</h1>
              <p className="text-sm text-zinc-500">
                AI displacement risk for a role — based on tasks, not titles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#report"
              className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50"
            >
              Jump to report
            </a>
            <button
              onClick={handleReset}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-12">
          {/* left column */}
          <section className="md:col-span-7">
            <Card
              title="Role inputs"
              subtitle="Paste a real job description. Titles help, but tasks drive the score."
              right={<Pill active={jobDesc.trim().length > 0}>{jobDesc.length} chars</Pill>}
            >
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-900">Job title (optional)</label>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Investment Banker"
                    className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm text-zinc-900 ring-1 ring-zinc-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-zinc-900">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm text-zinc-900 ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900/10"
                    >
                      <option value="">Select…</option>
                      {industries.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-900">Seniority</label>
                    <select
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm text-zinc-900 ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900/10"
                    >
                      <option value="">Select…</option>
                      {seniorities.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-zinc-900">Job description (required)</label>
                  <textarea
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    placeholder="Paste the full job description here…"
                    className="mt-1 min-h-[180px] w-full rounded-xl bg-white px-3 py-2 text-sm text-zinc-900 ring-1 ring-zinc-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    Pro tip: The more specific the description, the better the report.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* right column */}
          <aside className="md:col-span-5">
            <Card
              title="Tasks you actually do"
              subtitle="Pick 3–8 tasks you do weekly. This matters more than your title."
              right={<Pill active={selectedTasks.length >= 3 && selectedTasks.length <= 8}>{selectedTasks.length}/8</Pill>}
            >
              <div className="flex flex-wrap gap-2">
                {tasks.map((t) => {
                  const active = selectedTasks.includes(t);
                  const disabled = !active && selectedTasks.length >= 8;

                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTask(t)}
                      disabled={disabled}
                      className={[
                        "rounded-full px-3 py-2 text-left text-xs font-medium transition",
                        "ring-1",
                        active
                          ? "bg-zinc-900 text-white ring-zinc-900"
                          : "bg-white/70 text-zinc-700 ring-zinc-200 hover:bg-white",
                        disabled ? "opacity-40 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  {selectedTasks.length < 3
                    ? "Select at least 3 tasks to generate."
                    : selectedTasks.length > 8
                    ? "Max 8 tasks."
                    : "Ready to generate."}
                </p>
                <Pill active={selectedTasks.length >= 3 && selectedTasks.length <= 8}>
                  {selectedTasks.length >= 3 && selectedTasks.length <= 8 ? "Valid" : "Not ready"}
                </Pill>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Generating…" : "Generate NSFAI Report"}
              </button>

              <div className="mt-3 text-xs text-zinc-500">
                If you hit rate limit, wait ~30–60 seconds and try again.
              </div>
            </Card>
          </aside>

          {/* report */}
          <section id="report" className="md:col-span-12">
            <Card
              title="Report"
              subtitle="This will populate after generation."
              right={
                report ? (
                  <Pill active>Generated</Pill>
                ) : (
                  <Pill active={false}>Empty</Pill>
                )
              }
            >
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {!report ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-white/60 p-8 text-sm text-zinc-500">
                  No report yet.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* If your API returns fields like score, summary, etc, this will still show nicely */}
                  <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
                    <div className="text-xs font-semibold text-zinc-500">RAW OUTPUT</div>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-800">
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
                    <div className="text-xs font-semibold text-zinc-500">NEXT</div>
                    <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                      <li>• We can format the report into cards (Score, Automatable, Human Moat, Recommendations).</li>
                      <li>• Add “Copy report” button.</li>
                      <li>• Add history + shareable link.</li>
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
