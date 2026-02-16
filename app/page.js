"use client";

import { useState } from "react";

export default function Home() {
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("Tech");
  const [seniority, setSeniority] = useState("Senior / Lead");
  const [jobDescription, setJobDescription] = useState("");
  const [tasks, setTasks] = useState([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const taskOptions = [
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
    "Building software / automation / scripting"
  ];

  const toggleTask = (task) => {
    if (tasks.includes(task)) {
      setTasks(tasks.filter((t) => t !== task));
    } else {
      if (tasks.length < 8) {
        setTasks([...tasks, task]);
      }
    }
  };

  const handleSubmit = async () => {
    setError("");
    setResult("");

    if (!jobDescription.trim()) {
      setError("Job description is required.");
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
          description: jobDescription, // 🔥 IMPORTANT FIX
          tasks
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data.result);
      }
    } catch (err) {
      setError("Network error. Try again.");
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: 40, maxWidth: 900, margin: "auto" }}>
      <h1>NSFAI — Not Safe From AI</h1>

      <input
        placeholder="Job Title"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <textarea
        placeholder="Paste job description"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={6}
        style={{ width: "100%", marginBottom: 20 }}
      />

      <h3>Tasks (pick up to 8)</h3>

      {taskOptions.map((task) => (
        <div key={task}>
          <label>
            <input
              type="checkbox"
              checked={tasks.includes(task)}
              onChange={() => toggleTask(task)}
            />
            {task}
          </label>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "black",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        {loading ? "Generating..." : "Generate NSFAI Report"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 20 }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: 30, whiteSpace: "pre-wrap" }}>
          {result}
        </div>
      )}
    </main>
  );
}
