"use client";
import { useMemo, useState } from "react";

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
      const has = prev.includes(t);
      if (has) return prev.filter((x) => x !== t);
      if (prev.length >= 8) return prev; // cap
      return [...prev, t];
    });
  };

  const canGenerate =
    jobDesc.trim().length > 0 && selectedTasks.length >= 3 && selectedTasks.length <= 8 && !loading;

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, industry, seniority, jobDesc, tasks: selectedTasks }),
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 text-white font-semibold">
              N
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">NSFAI</h1>
              <p className="text-sm text-zinc-500">
                AI displacement risk — based on tasks, not titles.
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
              onClick={() => window.location.reload()}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-12">
          {/* Left: role */}
          <section className="md:col-span-7">
            <div className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold">Role inputs</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Paste a real job description. Titles help, tasks drive the score.
                  </p>
                </div>
                <div className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                  {jobDesc.length} chars
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="text-sm font-medium">Job title (optional)</label>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Investment Banker"
                    className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900/10"
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
                    <label className="text-sm font-medium">Seniority</label>
                    <select
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900/10"
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
                  <label className="text-sm font-medium">Job description (required)</label>
                  <textarea
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    placeholder="Paste the full job description here…"
                    className="mt-1 min-h-[180px] w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    More specific description → better report.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Right: tasks */}
          <aside className="md:col-span-5">
            <div className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold">Tasks you actually do</h2>
                  <p className="mt-1 text-sm text-zinc-500">Pick 3–8 weekly tasks.</p>
                </div>
                <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
                  {selectedTasks.length}/8
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
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
                        "rounded-full px-3 py-2 text-xs font-medium ring-1 transition",
                        active
                          ? "bg-zinc-900 text-white ring-zinc-900"
                          : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                        disabled ? "opacity-40 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Generating…" : "Generate NSFAI Report"}
              </button>

              <p className="mt-3 text-xs text-zinc-500">
                If you hit a rate limit, wait ~30–60 seconds and try again.
              </p>
            </div>
          </aside>

          {/* Report */}
          <section id="report" className="md:col-span-12">
            <div className="rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-zinc-200">
              <h2 className="text-sm font-semibold">Report</h2>
              <p className="mt-1 text-sm text-zinc-500">Populates after generation.</p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!report ? (
                <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-sm text-zinc-500">
                  No report yet.
                </div>
              ) : (
                <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-xs ring-1 ring-zinc-200">
                  {JSON.stringify(report, null, 2)}
                </pre>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
