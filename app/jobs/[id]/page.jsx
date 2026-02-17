"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function scoreBand(score) {
  const s = Number(score ?? 0);
  if (s >= 80)
    return {
      label: "Very resilient",
      blurb: "Strong human constraints + hard-to-automate surfaces.",
    };
  if (s >= 60)
    return {
      label: "Resilient",
      blurb: "Meaningful human moat signals. Some tasks may still be automated.",
    };
  if (s >= 40)
    return {
      label: "Mixed",
      blurb: "Balanced. Some work is defensible, some is tool-automatable.",
    };
  if (s >= 20)
    return {
      label: "Vulnerable",
      blurb: "Many tasks are repeatable / tool-driven. Likely compression risk.",
    };
  return {
    label: "Highly automatable",
    blurb: "Mostly repeatable work that AI tools can absorb quickly.",
  };
}

function pct(n01) {
  return Math.round(clamp(Number(n01 ?? 0), 0, 1) * 100);
}

// Mirrors your V1 logic conceptually (for visualization)
function computeSignals(attrs = {}) {
  const a = {
    embodiment: clamp(attrs.embodiment ?? 0.3, 0, 1),
    liability: clamp(attrs.liability ?? 0.3, 0, 1),
    autonomy: clamp(attrs.autonomy ?? 0.4, 0, 1),
    revenueProximity: clamp(attrs.revenueProximity ?? 0.4, 0, 1),
    regulatory: clamp(attrs.regulatory ?? 0.3, 0, 1),
    trustDepth: clamp(attrs.trustDepth ?? 0.35, 0, 1),
    repeatability: clamp(attrs.repeatability ?? 0.45, 0, 1),
    toolAutomation: clamp(attrs.toolAutomation ?? 0.4, 0, 1),
  };

  const positives = [
    {
      key: "embodiment",
      label: "Physical presence",
      value: a.embodiment,
      hint: "Requires hands-on work / real-world execution.",
    },
    {
      key: "liability",
      label: "Liability & sign-off",
      value: a.liability,
      hint: "High-stakes responsibility / accountability.",
    },
    {
      key: "regulatory",
      label: "Regulatory moat",
      value: a.regulatory,
      hint: "Compliance / licensing / regulated environments.",
    },
    {
      key: "trustDepth",
      label: "Trust depth",
      value: a.trustDepth,
      hint: "High-trust relationships with clients/patients/stakeholders.",
    },
    {
      key: "autonomy",
      label: "Autonomy",
      value: a.autonomy,
      hint: "End-to-end ownership, ambiguity, decision-making.",
    },
    {
      key: "revenueProximity",
      label: "Revenue proximity",
      value: a.revenueProximity,
      hint: "Closer to revenue / customers / pricing.",
    },
  ];

  const penalties = [
    {
      key: "repeatability",
      label: "Repeatability",
      value: a.repeatability,
      hint: "Routine tasks, standardized outputs.",
    },
    {
      key: "toolAutomation",
      label: "Tool automation exposure",
      value: a.toolAutomation,
      hint: "Workflows that map cleanly onto software tools.",
    },
  ];

  const automatable = [
    {
      label: "Documentation / summarization",
      score: a.repeatability * 0.7 + a.toolAutomation * 0.3,
    },
    {
      label: "Reporting / dashboards",
      score: a.toolAutomation * 0.65 + a.repeatability * 0.35,
    },
    {
      label: "Intake / admin coordination",
      score: a.repeatability * 0.6 + (1 - a.autonomy) * 0.4,
    },
  ]
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);

  const humanMoat = [
    { label: "Hands-on execution", score: a.embodiment },
    { label: "Liability / sign-off", score: a.liability },
    { label: "Regulatory compliance", score: a.regulatory },
  ]
    .sort((x, y) => y.score - x.score)
    .slice(0, 3);

  return { a, positives, penalties, automatable, humanMoat };
}

function detectChips(text = "") {
  const t = String(text).toLowerCase();
  const chips = [];
  const add = (label) => chips.push(label);

  if (/on[- ]site|field|clinic|lab|equipment|warehouse|patient/.test(t))
    add("Physical presence");
  if (/license|credential|compliance|audit|liability|risk/.test(t))
    add("Liability / compliance");
  if (/hipaa|fda|sec|finra|sox|gdpr|regulator/.test(t)) add("Regulatory");
  if (/strategy|lead|stakeholder|cross[- ]functional|roadmap/.test(t))
    add("Autonomy / leadership");
  if (/sales|pipeline|quota|revenue|pricing|renewal/.test(t))
    add("Revenue proximity");
  if (/documentation|summariz|routine|data entry|reporting|dashboards/.test(t))
    add("Repeatable tasks");
  if (/excel|sql|tableau|powerbi|jira|notion|zendesk/.test(t))
    add("Tool-driven workflows");

  return Array.from(new Set(chips)).slice(0, 10);
}

function Meter({ label, value, hint, accent = "bg-black" }) {
  const p = pct(value);
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/20 dark:bg-[#141414]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-black dark:text-white">
            {label}
          </div>
          <div className="mt-1 text-xs text-black/60 dark:text-white/60">
            {hint}
          </div>
        </div>
        <div className="text-sm font-semibold text-black dark:text-white">
          {p}
        </div>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-black/10 dark:bg-white/10">
        <div className={cx("h-2 rounded-full", accent)} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export default function JobDetailsPage({ params }) {
  const id = decodeURIComponent(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!data?.ok) throw new Error(data?.error || "Failed to load job.");
        setJob(data.job || null);
      } catch (e) {
        setError(e?.message || "Failed to load job.");
        setJob(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const score = Number(job?.resilience_score ?? 0);
  const band = useMemo(() => scoreBand(score), [score]);
  const signals = useMemo(
    () => computeSignals(job?.attributes_v1 || {}),
    [job?.attributes_v1]
  );
  const chips = useMemo(
    () => detectChips(`${job?.title || ""}\n${job?.description || ""}`),
    [job]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="text-sm text-black/60 dark:text-white/60">
          Loading…
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/jobs" className="text-sm font-semibold underline underline-offset-4">
          ← Back to search
        </Link>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "Job not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/jobs" className="text-sm font-semibold underline underline-offset-4">
          ← Back to search
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-50 dark:border-white/20 dark:bg-[#141414] dark:hover:bg-white/10"
        >
          Home
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-8 dark:border-white/20 dark:bg-[#141414]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-3xl font-extrabold text-black dark:text-white">
              {job.title || "Untitled role"}
            </div>
            <div className="mt-2 text-sm text-black/60 dark:text-white/60">
              {(job.company || "Unknown company") +
                (job.location ? ` — ${job.location}` : "")}
            </div>

            {chips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70 dark:border-white/20 dark:bg-[#141414] dark:text-white/70"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs text-black/50 dark:text-white/50">
              Resilience score
            </div>
            <div className="mt-1 text-5xl font-extrabold text-green-600">
              {score}
            </div>
            <div className="mt-2 text-sm font-semibold text-black dark:text-white">
              {band.label}
            </div>
            <div className="mt-1 max-w-[240px] text-xs text-black/60 dark:text-white/60">
              {band.blurb}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-5 text-sm text-black/80 dark:border-white/20 dark:bg-black/20 dark:text-white/80">
          <div className="font-semibold">How to read this score</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="font-semibold">0–30</span>: most tasks map cleanly
              to tools → higher compression risk.
            </li>
            <li>
              <span className="font-semibold">40–60</span>: mixed surface area →
              some durable, some automatable.
            </li>
            <li>
              <span className="font-semibold">70–100</span>: strong human
              constraints (embodiment, liability, regulation, trust).
            </li>
          </ul>
          <div className="mt-3 text-xs text-black/60 dark:text-white/60">
            Note: this is “task-surface resilience,” not “job extinction
            prediction.”
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/20 dark:bg-[#141414]">
            <div className="text-sm font-semibold text-black dark:text-white">
              Why it ranked
            </div>
            <div className="mt-2 text-sm text-black/80 dark:text-white/80">
              {job.resilience_reason || "Resilience signal pending."}
            </div>
            <div className="mt-2 text-xs text-black/60 dark:text-white/60">
              This label is derived from the strongest signals detected in the
              title + description.
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/20 dark:bg-[#141414]">
            <div className="text-sm font-semibold text-black dark:text-white">
              Quick take
            </div>
            <div className="mt-2 text-sm text-black/80 dark:text-white/80">
              The score rises when the role has{" "}
              <span className="font-semibold">
                embodiment, liability, regulation, trust, autonomy
              </span>
              . It falls when the work is{" "}
              <span className="font-semibold">repeatable</span> and{" "}
              <span className="font-semibold">tool-automatable</span>.
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-3 text-sm font-semibold text-black dark:text-white">
              Positive resilience signals
            </div>
            <div className="space-y-3">
              {signals.positives.map((x) => (
                <Meter
                  key={x.key}
                  label={x.label}
                  value={x.value}
                  hint={x.hint}
                  accent="bg-green-600"
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-black dark:text-white">
              Automation exposure (penalties)
            </div>
            <div className="space-y-3">
              {signals.penalties.map((x) => (
                <Meter
                  key={x.key}
                  label={x.label}
                  value={x.value}
                  hint={x.hint}
                  accent="bg-red-500"
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/20 dark:bg-[#141414]">
                <div className="text-sm font-semibold text-black dark:text-white">
                  Likely automatable first
                </div>
                <div className="mt-3 space-y-2">
                  {signals.automatable.map((x) => (
                    <div
                      key={x.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-black/80 dark:text-white/80">
                        {x.label}
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {pct(x.score)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/20 dark:bg-[#141414]">
                <div className="text-sm font-semibold text-black dark:text-white">
                  Harder to automate
                </div>
                <div className="mt-3 space-y-2">
                  {signals.humanMoat.map((x) => (
                    <div
                      key={x.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-black/80 dark:text-white/80">
                        {x.label}
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {pct(x.score)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/20 dark:bg-[#141414]">
          <div className="text-sm font-semibold text-black dark:text-white">
            Description
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">
            {String(job.description || "").slice(0, 1200)}
            {String(job.description || "").length > 1200 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold underline underline-offset-4">
                  Show full description
                </summary>
                <div className="mt-3 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">
                  {job.description}
                </div>
              </details>
            ) : null}
          </div>

          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4"
            >
              Open original posting →
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
