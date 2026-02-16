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

export default function Page() {
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("Tech");
  const [seniority, setSeniority] = useState("Mid");
  const [jobDescription, setJobDescription] = useState("");

  const [selectedTasks, setSelectedTasks] = useState([
    "Writing emails, documentation, or reports",
    "Summarizing information / research",
    "Spreadsheet reporting / dashboards",
    "Designing workflows / SOPs / process improvement",
    "Leading meetings / stakeholder management",
    "High-stakes decisions / sign-off / liability responsibility",
    "Creative strategy / brand / ambiguous problem solving",
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState("");

  const selectedCount = selectedTasks.length;

  const canSubmit = useMemo(() => {
    return jobDescription.trim().length > 0 && selectedCount >= 3 && !loading;
  }, [jobDescription, selectedCount, loading]);

  const toggleTask = (task) => {
    setError("");
    setReport("");

    setSelectedTasks((prev) => {
      const exists = prev.includes(task);

      // remove
      if (exists) return prev.filter((t) => t !== task);

      // add (limit 8)
      if (prev.length >= 8) {
        setError("You can pick up to 8 tasks.");
        return prev;
      }
      return [...prev, task];
    });
  };

  const handleSubmit = async () => {
    if (loading) return;

    const jd = jobDescription.trim();
    if (!jd) {
      setError("Job description is required.");
      return;
    }

    if (selectedTasks.length < 3) {
      setError("Pick at least 3 tasks.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          industry,
          seniority,
          jobDescription: jd,
          tasks: selectedTasks,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Something went wrong.");
      } else {
        setReport(data?.report || "");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <h1 className="text-4xl font-bold tracking-tight">NSFAI — Not Safe From AI</h1>
          <div className="text-sm text-gray-500 pt-2">AI displacement risk for any role</div>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 p-6 shadow-sm">
          {/* Top inputs */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold mb-2">Job title (optional)</label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Investment Banker"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-semibold mb-2">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              >
                <option>Tech</option>
                <option>Finance</option>
                <option>Healthcare</option>
                <option>Legal</option>
                <option>Education</option>
                <option>Retail</option>
                <option>Manufacturing</option>
                <option>Government</option>
                <option>Other</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-semibold mb-2">Seniority</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              >
                <option>Entry</option>
                <option>Mid</option>
                <option>Senior / Lead</option>
                <option>Manager</option>
                <option>Director</option>
                <option>VP+</option>
              </select>
            </div>
          </div>

          {/* Job description */}
          <div className="mt-6">
            <label className="block text-sm font-semibold mb-2">
              Paste job description (required)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={7}
              placeholder="Paste the job description here…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Tasks */}
          <div className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                Tasks you actually do (pick 3–8) — selected: {selectedCount}
              </h2>
              <div className="text-xs text-gray-500">Max 8</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {TASK_OPTIONS.map((task) => {
                const checked = selectedTasks.includes(task);
                return (
                  <label
                    key={task}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                      checked ? "border-black" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTask(task)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{task}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-lg bg-black px-6 py-3 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate NSFAI Report"}
            </button>

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Report */}
            {report && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-sm font-semibold mb-2">Report</div>
                <pre className="whitespace-pre-wrap text-sm leading-6">
                  {report}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Tip: If you hit “Rate limit”, wait ~10–30 seconds and try again. The button locks while generating.
        </div>
      </div>
    </main>
  );
}
