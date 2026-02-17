// app/roi/benchmarks.js

export const MAJORS = [
  {
    key: "Accounting (BS)",
    aliases: ["accounting", "acct", "cpa"],
    startSalary: 65000,
    growth: 0.038,
    plateauYear: 18,
    plateauGrowth: 0.015,
    aiExposure: 6,
    notes:
      "Stable demand, but junior layers compress first. Upside comes from advisory/ownership, FP&A, controls, and domain specialization.",
  },
  {
    key: "Computer Science (BS)",
    aliases: ["cs", "computer science", "software engineering", "swe"],
    startSalary: 105000,
    growth: 0.055,
    plateauYear: 12,
    plateauGrowth: 0.02,
    aiExposure: 7,
    notes:
      "High productivity leverage + high automation pressure. Early differentiation is scope ownership + systems thinking + shipping velocity.",
  },
  {
    key: "Nursing (BSN)",
    aliases: ["nursing", "bsn", "rn"],
    startSalary: 85000,
    growth: 0.035,
    plateauYear: 20,
    plateauGrowth: 0.02,
    aiExposure: 3,
    notes:
      "Embodiment + liability + trust moat. AI augments paperwork and diagnostics support more than bedside care.",
  },
  {
    key: "Finance (BS)",
    aliases: ["finance", "investment", "ib", "fp&a"],
    startSalary: 75000,
    growth: 0.045,
    plateauYear: 15,
    plateauGrowth: 0.018,
    aiExposure: 6,
    notes:
      "Structured outputs compress; advantage shifts to judgment, relationship, and decision ownership.",
  },
  {
    key: "Marketing (BA)",
    aliases: ["marketing", "growth", "brand"],
    startSalary: 60000,
    growth: 0.04,
    plateauYear: 14,
    plateauGrowth: 0.018,
    aiExposure: 5,
    notes:
      "Content commoditizes; strategy + distribution + measured performance wins. Brand taste still human-heavy.",
  },
];

export const CITIES = [
  {
    key: "New York, NY",
    salaryMult: 1.10,
    livingAfter: 52000,
    livingSchool: 38000,
    taxRate: 0.28,
    notes: "High rent + state/city tax. Higher salary but expensive runway.",
  },
  {
    key: "San Francisco, CA",
    salaryMult: 1.20,
    livingAfter: 60000,
    livingSchool: 42000,
    taxRate: 0.30,
    notes: "Highest costs, strong top-end upside. Compression shows up early in tech-adjacent roles.",
  },
  {
    key: "Los Angeles, CA",
    salaryMult: 1.05,
    livingAfter: 48000,
    livingSchool: 36000,
    taxRate: 0.28,
    notes: "High housing cost, moderate salary lift vs baseline.",
  },
  {
    key: "Dallas, TX",
    salaryMult: 0.95,
    livingAfter: 38000,
    livingSchool: 30000,
    taxRate: 0.22,
    notes: "Lower costs + no state income tax. Great for early savings rate.",
  },
];

export const SCHOOL_TYPES = [
  { key: "Community College", tuitionPerYear: 4500 },
  { key: "In-State Public", tuitionPerYear: 12000 },
  { key: "Out-of-State Public", tuitionPerYear: 28000 },
  { key: "Private", tuitionPerYear: 52000 },
];

export const LIFESTYLES = [
  { key: "Cheap", livingMult: 0.85 },
  { key: "Normal", livingMult: 1.0 },
  { key: "Aggressive", livingMult: 1.25 },
];

export function pickMajor(freeText, selectedKey) {
  if (selectedKey) return MAJORS.find((m) => m.key === selectedKey) || MAJORS[0];

  const t = (freeText || "").trim().toLowerCase();
  if (!t) return MAJORS[0];

  // Find by alias hit
  for (const m of MAJORS) {
    if (m.key.toLowerCase() === t) return m;
    if (m.aliases?.some((a) => t.includes(a))) return m;
  }
  return MAJORS[0];
}

export function pickCity(cityKey) {
  return CITIES.find((c) => c.key === cityKey) || CITIES[0];
}

export function pickSchoolType(typeKey) {
  return SCHOOL_TYPES.find((s) => s.key === typeKey) || SCHOOL_TYPES[1];
}

export function pickLifestyle(key) {
  return LIFESTYLES.find((l) => l.key === key) || LIFESTYLES[1];
}
