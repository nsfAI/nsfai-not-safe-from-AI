"use client";

import React, { useMemo, useRef, useState } from "react";

const INDUSTRIES = [
  "Tech",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Government",
  "Legal",
  "Real Estate",
  "Media",
  "Other",
];

const SENIORITIES = ["Entry", "Mid", "Senior", "Manager", "Director", "Executive"];

const TASKS = [
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function bandFromScore(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return "Medium";
  if (s <= 3) return "Low";
  if (s <= 7) return "Medium";
  return "High";
}

function bandStyles(band) {
  // neutral monochrome, matches your UI
  if (band === "Low") return { label: "Low", pill: "pill pill-green" };
  if (band === "High") return { label: "High", pill: "pill pill-red" };
  return { label: "Medium", pill: "pill pill-amber" };
}

function prettyTimeHorizon(h) {
  if (!h) return "";
  if (h === "0-12m") return "0–12 months";
  if (h === "1-3y") return "1–3 years";
  if (h === "3-5y") return "3–5 years";
  return h;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeStr(v) {
  return typeof v === "string" ? v : "";
}

function ReportCard({ data }) {
  const report = data?.report || data; // supports either shape
  if (!report) return null;

  const score = clamp(Number(report.risk_score ?? report.riskScore ?? 6), 0, 10);
  const band = safeStr(report.risk_band) || bandFromScore(score);
  const b = bandStyles(band);

  const why = safeArray(report.why);
  const mostAutomatable = safeArray(report.most_automatable);
  const mostHumanMoat = safeArray(report.most_human_moat);
  const recommendations = safeArray(report.recommendations);
  const assumptions = safeArray(report.assumptions);

  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">Report</div>
          <div className="cardSub">Generated from your job description + tasks.</div>
        </div>
        <div className="rightHeader">
          <div className={b.pill}>{b.label} risk</div>
          <div className="scoreBadge">
            <div className="scoreNum">{score}</div>
            <div className="scoreDen">/10</div>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="grid2">
        <div className="panel">
          <div className="panelTitle">Why this score</div>
          {why.length ? (
            <ul className="bullets">
              {why.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          ) : (
            <div className="muted">No explanation returned.</div>
          )}
        </div>

        <div className="panel">
          <div className="panelTitle">What to do next</div>
          {recommendations.length ? (
            <ol className="bullets ordered">
              {recommendations.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          ) : (
            <div className="muted">No recommendations returned.</div>
          )}
        </div>
      </div>

      <div className="spacer" />

      <div className="grid2">
        <div className="panel">
          <div className="panelTitle">Most automatable</div>
          <div className="panelSub">Tasks AI can help automate first.</div>
          {mostAutomatable.length ? (
            <div className="stack">
              {mostAutomatable.map((t, i) => (
                <div key={i} className="rowCard">
                  <div className="rowTop">
                    <div className="rowTask">{t.task}</div>
                    <div className="miniPill">{prettyTimeHorizon(t.time_horizon)}</div>
                  </div>
                  <div className="rowReason">{t.reason}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No automatable tasks returned.</div>
          )}
        </div>

        <div className="panel">
          <div className="panelTitle">Human moat</div>
          <div className="panelSub">The parts that stay human for longer.</div>
          {mostHumanMoat.length ? (
            <div className="stack">
              {mostHumanMoat.map((t, i) => (
                <div key={i} className="rowCard">
                  <div className="rowTop">
                    <div className="rowTask">{t.task}</div>
                    <div className="miniPill dark">Hard to automate</div>
                  </div>
                  <div className="rowReason">{t.reason}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No human moat tasks returned.</div>
          )}
        </div>
      </div>

      <div className="spacer" />

      <div className="panel">
        <div className="panelTitle">Assumptions</div>
        {assumptions.length ? (
          <ul className="bullets">
            {assumptions.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : (
          <div className="muted">None.</div>
        )}
      </div>

      {data?.usedModel ? (
        <div className="footNote">
          Model: <span className="mono">{data.usedModel}</span>
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  const reportRef = useRef(null);

  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("Tech");
  const [seniority, setSeniority] = useState("Executive");
  const [jobDesc, setJobDesc] = useState("");

  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [apiError, setApiError] = useState("");
  const [reportData, setReportData] = useState(null);

  const chars = useMemo(() => jobDesc.length, [jobDesc]);

  const canGenerate = jobDesc.trim().length > 0 && selectedTasks.length >= 3 && selectedTasks.length <= 8 && !isLoading;

  function toggleTask(t) {
    setApiError("");
    setReportData(null);
    setSelectedTasks((prev) => {
      const has = prev.includes(t);
      if (has) return prev.filter((x) => x !== t);
      if (prev.length >= 8) return prev; // cap
      return [...prev, t];
    });
  }

  function resetAll() {
    setJobTitle("");
    setIndustry("Tech");
    setSeniority("Executive");
    setJobDesc("");
    setSelectedTasks([]);
    setIsLoading(false);
    setApiError("");
    setReportData(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToReport() {
    reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function generate() {
    setApiError("");
    setReportData(null);
    setIsLoading(true);

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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.details ? `${data.error || "Request failed"} — ${data.details}` : data?.error || "Request failed";
        setApiError(msg);
        return;
      }

      setReportData(data);
      setTimeout(() => jumpToReport(), 50);
    } catch (e) {
      setApiError(e?.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="logo">N</div>
          <div className="brandText">
            <div className="brandTitle">NSFAI</div>
            <div className="brandSub">AI displacement risk for a role — based on tasks, not titles.</div>
          </div>
        </div>

        <div className="topActions">
          <button className="btn ghost" onClick={jumpToReport}>
            Jump to report
          </button>
          <button className="btn" onClick={resetAll}>
            Reset
          </button>
        </div>
      </header>

      <main className="container">
        <div className="gridMain">
          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Role inputs</div>
                <div className="cardSub">Paste a real job description. Titles help, tasks drive the score.</div>
              </div>
              <div className="chip">{chars} chars</div>
            </div>

            <div className="form">
              <div className="field">
                <label>Job title (optional)</label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Director of Strategic Operations"
                />
              </div>

              <div className="row2">
                <div className="field">
                  <label>Industry</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                    {INDUSTRIES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Seniority</label>
                  <select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                    {SENIORITIES.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Job description (required)</label>
                <textarea
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={9}
                />
                <div className="hint">More specific description → better report.</div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Tasks you actually do</div>
                <div className="cardSub">Pick 3–8 weekly tasks.</div>
              </div>
              <div className="chip">{selectedTasks.length}/8</div>
            </div>

            <div className="taskGrid">
              {TASKS.map((t) => {
                const active = selectedTasks.includes(t);
                const disabled = !active && selectedTasks.length >= 8;
                return (
                  <button
                    key={t}
                    className={`taskPill ${active ? "active" : ""}`}
                    onClick={() => toggleTask(t)}
                    disabled={disabled}
                    title={disabled ? "Max 8 tasks" : ""}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <button className="btn primary" onClick={generate} disabled={!canGenerate}>
              {isLoading ? "Generating…" : "Generate NSFAI Report"}
            </button>

            <div className="fineprint">If you hit a rate limit, wait ~30–60 seconds and try again.</div>
          </section>
        </div>

        <section ref={reportRef} className="card reportCard">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Report</div>
              <div className="cardSub">Populates after generation.</div>
            </div>
            <div className="chip">{reportData ? "Generated" : "Empty"}</div>
          </div>

          {apiError ? (
            <div className="alert">
              <div className="alertTitle">Request failed</div>
              <div className="alertBody">{apiError}</div>
            </div>
          ) : null}

          {!reportData && !apiError ? (
            <div className="empty">
              <div className="emptyTitle">No report yet.</div>
              <div className="emptySub">Fill the description, pick tasks, then generate.</div>
            </div>
          ) : null}

          {reportData ? <ReportCard data={reportData} /> : null}
        </section>
      </main>

      {/* Inline styles so you don't have to touch globals.css */}
      <style jsx global>{`
        :root {
          --bg: #fafafa;
          --card: #ffffff;
          --text: #0f1115;
          --muted: #6b7280;
          --line: rgba(15, 17, 21, 0.08);
          --shadow: 0 10px 30px rgba(15, 17, 21, 0.06);
          --shadow2: 0 6px 18px rgba(15, 17, 21, 0.08);
          --radius: 18px;
        }

        html,
        body {
          background: var(--bg);
          color: var(--text);
        }

        .page {
          min-height: 100vh;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(250, 250, 250, 0.75);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
          padding: 18px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #121316;
          color: white;
          font-weight: 700;
        }

        .brandTitle {
          font-size: 18px;
          font-weight: 750;
          line-height: 1.1;
        }

        .brandSub {
          font-size: 13px;
          color: var(--muted);
          margin-top: 2px;
        }

        .topActions {
          display: flex;
          gap: 10px;
        }

        .container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 18px 44px;
        }

        .gridMain {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 18px;
          align-items: start;
        }

        @media (max-width: 980px) {
          .gridMain {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 18px;
        }

        .cardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .cardTitle {
          font-weight: 750;
          font-size: 15px;
        }

        .cardSub {
          color: var(--muted);
          font-size: 13px;
          margin-top: 2px;
        }

        .chip {
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.6);
        }

        .form {
          display: grid;
          gap: 12px;
        }

        .row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 680px) {
          .row2 {
            grid-template-columns: 1fr;
          }
        }

        .field label {
          display: block;
          font-size: 12px;
          font-weight: 650;
          margin-bottom: 6px;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px 12px;
          font-size: 14px;
          background: #fff;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          box-shadow: var(--shadow2);
          border-color: rgba(15, 17, 21, 0.18);
        }

        textarea {
          resize: vertical;
        }

        .hint {
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
        }

        .taskGrid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 10px 0 14px;
        }

        .taskPill {
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12.5px;
          background: #fff;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
        }

        .taskPill:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow2);
        }

        .taskPill.active {
          background: #121316;
          border-color: #121316;
          color: #fff;
        }

        .taskPill:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .btn {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 10px 14px;
          font-weight: 650;
          background: #fff;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow2);
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn.primary {
          width: 100%;
          background: #121316;
          color: #fff;
          border-color: #121316;
          padding: 12px 14px;
        }

        .btn.ghost {
          background: transparent;
        }

        .fineprint {
          margin-top: 10px;
          font-size: 12px;
          color: var(--muted);
        }

        .reportCard {
          margin-top: 18px;
        }

        .alert {
          border: 1px solid rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.07);
          border-radius: 14px;
          padding: 12px;
          margin: 10px 0 12px;
        }

        .alertTitle {
          font-weight: 750;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .alertBody {
          font-size: 13px;
          color: #7f1d1d;
          word-break: break-word;
        }

        .empty {
          border: 1px dashed var(--line);
          border-radius: 14px;
          padding: 16px;
          color: var(--muted);
          background: rgba(255, 255, 255, 0.6);
        }

        .emptyTitle {
          font-weight: 750;
          color: var(--text);
          margin-bottom: 4px;
        }

        .emptySub {
          font-size: 13px;
        }

        /* Report UI */
        .divider {
          border-top: 1px solid var(--line);
          margin: 12px 0;
        }

        .rightHeader {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .scoreBadge {
          display: flex;
          align-items: baseline;
          gap: 4px;
          border: 1px solid var(--line);
          padding: 6px 10px;
          border-radius: 999px;
          background: #fff;
        }

        .scoreNum {
          font-weight: 800;
          font-size: 16px;
        }

        .scoreDen {
          color: var(--muted);
          font-size: 12px;
        }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 980px) {
          .grid2 {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.6);
        }

        .panelTitle {
          font-weight: 750;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .panelSub {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 10px;
        }

        .bullets {
          margin: 0;
          padding-left: 16px;
          color: var(--text);
          font-size: 13px;
          line-height: 1.55;
        }

        .bullets.ordered {
          padding-left: 18px;
        }

        .muted {
          color: var(--muted);
          font-size: 13px;
        }

        .spacer {
          height: 14px;
        }

        .stack {
          display: grid;
          gap: 10px;
        }

        .rowCard {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 12px;
          background: #fff;
        }

        .rowTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .rowTask {
          font-weight: 750;
          font-size: 13px;
        }

        .rowReason {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.45;
        }

        .miniPill {
          font-size: 11px;
          color: var(--muted);
          border: 1px solid var(--line);
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
          white-space: nowrap;
        }

        .miniPill.dark {
          color: #fff;
          background: #121316;
          border-color: #121316;
        }

        .pill {
          font-size: 12px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #fff;
        }

        .pill-green {
          border-color: rgba(34, 197, 94, 0.25);
          background: rgba(34, 197, 94, 0.1);
          color: rgba(21, 128, 61, 1);
        }

        .pill-amber {
          border-color: rgba(245, 158, 11, 0.25);
          background: rgba(245, 158, 11, 0.12);
          color: rgba(146, 64, 14, 1);
        }

        .pill-red {
          border-color: rgba(239, 68, 68, 0.25);
          background: rgba(239, 68, 68, 0.1);
          color: rgba(153, 27, 27, 1);
        }

        .footNote {
          margin-top: 12px;
          font-size: 12px;
          color: var(--muted);
        }

        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          color: rgba(17, 24, 39, 0.9);
        }
      `}</style>
    </div>
  );
}
