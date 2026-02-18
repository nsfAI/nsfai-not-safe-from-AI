// lib/vector/roles.js
// V1 seed ontology. Expand over time or replace with O*NET ingestion later.
// Task taxonomy keys must stay consistent across user + roles.

export const TASK_KEYS = [
  "analysis",
  "writing",
  "data_ops",
  "dashboards",
  "customer_support",
  "coordination",
  "process_design",
  "sales_negotiation",
  "stakeholder_mgmt",
  "physical_ops",
  "caregiving",
  "high_stakes_liability",
  "creative_strategy",
  "coding_automation",
  "compliance_regulatory",
];

// Helpers
function tv(obj = {}) {
  // normalize to sum=1
  const out = {};
  let sum = 0;
  for (const k of TASK_KEYS) {
    const v = Math.max(0, Number(obj[k] ?? 0));
    out[k] = v;
    sum += v;
  }
  if (!sum) {
    // default: balanced office work
    const u = 1 / TASK_KEYS.length;
    for (const k of TASK_KEYS) out[k] = u;
    return out;
  }
  for (const k of TASK_KEYS) out[k] = out[k] / sum;
  return out;
}

// V1 ROLE ONTOLOGY (seed ~40). Add as many as you want later.
export const ROLE_ONTOLOGY = [
  {
    role_id: "finance_analyst",
    titles: ["Financial Analyst"],
    aliases: ["FP&A Analyst", "Corporate Finance Analyst", "Budget Analyst"],
    sector: "Finance",
    skill_family: "Finance & Analysis",
    seniority_bands: ["Entry", "Mid", "Senior"],
    skills: [
      { name: "Financial modeling", w: 0.9, critical: true },
      { name: "Forecasting", w: 0.8, critical: true },
      { name: "Excel", w: 0.7, critical: true },
      { name: "Business partnering", w: 0.6, critical: false },
      { name: "SQL", w: 0.4, critical: false },
    ],
    tools: ["Excel", "PowerPoint", "SQL", "Power BI/Tableau"],
    work_context: {
      embodiment: 0.15,
      liability: 0.35,
      trustDepth: 0.45,
      realTimeLoad: 0.35,
      regulatory: 0.25,
      unpredictability: 0.25,
    },
    task_vector: tv({
      analysis: 0.26,
      dashboards: 0.16,
      writing: 0.12,
      stakeholder_mgmt: 0.18,
      coordination: 0.08,
      data_ops: 0.10,
      compliance_regulatory: 0.10,
    }),
    automation_exposure_baseline: 6.2, // 0–10 (higher = more exposed)
    compression_overlay: { score: 52, momentum_60d: 8 }, // 0–100 + delta
    income: { low: 65000, mid: 90000, high: 135000 },
    transition_edges: [
      { from: "accountant", friction: 0.35 },
      { from: "business_analyst", friction: 0.30 },
      { from: "data_analyst", friction: 0.40 },
    ],
  },

  {
    role_id: "accountant",
    titles: ["Accountant"],
    aliases: ["Staff Accountant", "Corporate Accountant", "GL Accountant", "Auditor"],
    sector: "Finance",
    skill_family: "Accounting",
    seniority_bands: ["Entry", "Mid", "Senior"],
    skills: [
      { name: "Accounting", w: 0.9, critical: true },
      { name: "Close process", w: 0.8, critical: true },
      { name: "Excel", w: 0.7, critical: true },
      { name: "Controls/SOX", w: 0.5, critical: false },
      { name: "ERP systems", w: 0.5, critical: false },
    ],
    tools: ["Excel", "NetSuite/SAP", "Workpapers"],
    work_context: {
      embodiment: 0.10,
      liability: 0.45,
      trustDepth: 0.35,
      realTimeLoad: 0.20,
      regulatory: 0.40,
      unpredictability: 0.20,
    },
    task_vector: tv({
      analysis: 0.18,
      data_ops: 0.20,
      dashboards: 0.12,
      writing: 0.12,
      compliance_regulatory: 0.18,
      repeatability: 0.0, // not used in this module; just ignore
      stakeholder_mgmt: 0.10,
      coordination: 0.10,
    }),
    automation_exposure_baseline: 6.6,
    compression_overlay: { score: 58, momentum_60d: 10 },
    income: { low: 60000, mid: 85000, high: 125000 },
    transition_edges: [
      { from: "finance_analyst", friction: 0.35 },
      { from: "risk_analyst", friction: 0.40 },
    ],
  },

  {
    role_id: "nurse_rn",
    titles: ["Registered Nurse (RN)"],
    aliases: ["Nurse", "Bedside RN", "Clinical Nurse"],
    sector: "Healthcare",
    skill_family: "Clinical Care",
    seniority_bands: ["Entry", "Mid", "Senior"],
    skills: [
      { name: "Clinical care", w: 0.9, critical: true },
      { name: "Patient communication", w: 0.8, critical: true },
      { name: "Documentation", w: 0.6, critical: false },
      { name: "Triage", w: 0.7, critical: false },
    ],
    tools: ["EHR (Epic/Cerner)"],
    work_context: {
      embodiment: 0.85,
      liability: 0.70,
      trustDepth: 0.70,
      realTimeLoad: 0.70,
      regulatory: 0.55,
      unpredictability: 0.65,
    },
    task_vector: tv({
      caregiving: 0.30,
      physical_ops: 0.22,
      stakeholder_mgmt: 0.12,
      writing: 0.10,
      compliance_regulatory: 0.10,
      high_stakes_liability: 0.16,
    }),
    automation_exposure_baseline: 2.8,
    compression_overlay: { score: 26, momentum_60d: 2 },
    income: { low: 70000, mid: 95000, high: 140000 },
    transition_edges: [{ from: "medical_assistant", friction: 0.55 }],
  },

  {
    role_id: "software_engineer",
    titles: ["Software Engineer"],
    aliases: ["Backend Engineer", "Frontend Engineer", "Full Stack Developer", "SWE"],
    sector: "Tech",
    skill_family: "Software",
    seniority_bands: ["Entry", "Mid", "Senior"],
    skills: [
      { name: "Programming", w: 0.9, critical: true },
      { name: "System design", w: 0.7, critical: false },
      { name: "Testing", w: 0.6, critical: false },
      { name: "Cloud", w: 0.5, critical: false },
    ],
    tools: ["Git", "CI/CD", "Cloud", "Databases"],
    work_context: {
      embodiment: 0.05,
      liability: 0.30,
      trustDepth: 0.35,
      realTimeLoad: 0.35,
      regulatory: 0.15,
      unpredictability: 0.35,
    },
    task_vector: tv({
      coding_automation: 0.34,
      analysis: 0.18,
      process_design: 0.16,
      stakeholder_mgmt: 0.10,
      writing: 0.10,
      coordination: 0.12,
    }),
    automation_exposure_baseline: 7.0,
    compression_overlay: { score: 62, momentum_60d: 12 },
    income: { low: 95000, mid: 150000, high: 260000 },
    transition_edges: [{ from: "data_analyst", friction: 0.55 }],
  },

  {
    role_id: "teacher_k12",
    titles: ["Teacher (K-12)"],
    aliases: ["Educator", "Instructor"],
    sector: "Education",
    skill_family: "Teaching",
    seniority_bands: ["Entry", "Mid", "Senior"],
    skills: [
      { name: "Classroom management", w: 0.9, critical: true },
      { name: "Instruction design", w: 0.7, critical: false },
      { name: "Communication", w: 0.8, critical: true },
    ],
    tools: ["LMS tools", "Docs"],
    work_context: {
      embodiment: 0.55,
      liability: 0.40,
      trustDepth: 0.70,
      realTimeLoad: 0.60,
      regulatory: 0.35,
      unpredictability: 0.55,
    },
    task_vector: tv({
      stakeholder_mgmt: 0.18,
      caregiving: 0.18,
      writing: 0.12,
      creative_strategy: 0.12,
      high_stakes_liability: 0.10,
      physical_ops: 0.12,
      coordination: 0.18,
    }),
    automation_exposure_baseline: 3.8,
    compression_overlay: { score: 34, momentum_60d: 3 },
    income: { low: 45000, mid: 65000, high: 95000 },
    transition_edges: [{ from: "tutor", friction: 0.35 }],
  },

  // Add more roles freely — this V1 ships now.
];
