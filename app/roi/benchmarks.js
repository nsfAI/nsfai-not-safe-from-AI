// app/roi/benchmarks.js
// Minimal, stable benchmark tables + pick* helpers.
// Exports MUST match page.jsx imports exactly.

export const MAJORS = [
  {
    key: "Accounting (BS)",
    startSalary: 65000,
    growth: 0.038,
    plateauYear: 18,
    plateauGrowth: 0.018,
    aiExposure: 6,
    notes:
      "Stable demand, but task automation hits junior layers first. Upside is role evolution into advisory/FP&A/controls ownership.",
  },
  {
    key: "Computer Science (BS)",
    startSalary: 95000,
    growth: 0.055,
    plateauYear: 12,
    plateauGrowth: 0.025,
    aiExposure: 8,
    notes:
      "High early upside and strong optionality, but compression risk rises as codegen + agentic tooling absorbs junior tasks. Differentiate via systems, product, and ownership.",
  },
  {
    key: "Nursing (BSN)",
    startSalary: 78000,
    growth: 0.040,
    plateauYear: 16,
    plateauGrowth: 0.020,
    aiExposure: 3,
    notes:
      "Embodiment + liability create resistance. AI augments documentation/triage but core work remains physical and trust-heavy.",
  },
  {
    key: "Finance (BS)",
    startSalary: 75000,
    growth: 0.045,
    plateauYear: 14,
    plateauGrowth: 0.020,
    aiExposure: 7,
    notes:
      "Structured analysis compresses quickly. The moat is judgment, narrative framing, client trust, and accountability.",
  },
  {
    key: "Marketing (BA)",
    startSalary: 60000,
    growth: 0.042,
    plateauYear: 14,
    plateauGrowth: 0.020,
    aiExposure: 7,
    notes:
      "Content and basic creative are commoditized. Moat shifts to distribution, brand taste, experimentation cadence, and revenue linkage.",
  },
];

export const CITIES = [
  {
    key: "New York, NY",
    salaryMult: 1.15,
    livingSchool: 36000,
    livingAfter: 52000,
    taxRate: 0.30,
    notes: "High cost, high density of opportunity. Taxes + rent bite hard; comp must clear the bar.",
  },
  {
    key: "San Francisco, CA",
    salaryMult: 1.25,
    livingSchool: 38000,
    livingAfter: 56000,
    taxRate: 0.31,
    notes: "Top-tier comp potential. Living costs punish low early earnings; upside if you capture high-growth paths.",
  },
  {
    key: "Los Angeles, CA",
    salaryMult: 1.12,
    livingSchool: 34000,
    livingAfter: 50000,
    taxRate: 0.29,
    notes: "Costs high but varied. Outcomes depend heavily on industry cluster and housing choices.",
  },
  {
    key: "Dallas, TX",
    salaryMult: 0.98,
    livingSchool: 24000,
    livingAfter: 36000,
    taxRate: 0.22,
    notes: "Lower taxes and cost. Great for break-even speed; slightly lower salary ceiling.",
  },
  {
    key: "Chicago, IL",
    salaryMult: 1.03,
    livingSchool: 27000,
    livingAfter: 40000,
    taxRate: 0.27,
    notes: "Balanced cost/opportunity. Solid middle ground vs coasts.",
  },
];

export const SCHOOL_TYPES = [
  { key: "In-State Public", tuitionPerYear: 12000 },
  { key: "Out-of-State Public", tuitionPerYear: 28000 },
  { key: "Private", tuitionPerYear: 52000 },
  { key: "Community College", tuitionPerYear: 4500 },
];

export const LIFESTYLES = [
  { key: "Frugal", livingMult: 0.82 },
  { key: "Normal", livingMult: 1.0 },
  { key: "High", livingMult: 1.25 },
];

// ----- pick helpers (MUST be functions) -----

function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

export function pickMajor(freeText, benchmarkKey) {
  // If they selected a benchmark, prefer that.
  const byKey = MAJORS.find((m) => m.key === benchmarkKey);
  if (byKey) return byKey;

  // If free text resembles a key, try fuzzy match.
  const q = normalize(freeText);

  if (!q) return MAJORS[0];

  const contains = (needle) => q.includes(normalize(needle));

  if (contains("account")) return MAJORS.find((m) => m.key.startsWith("Accounting")) || MAJORS[0];
  if (contains("computer") || contains("cs") || contains("software")) return MAJORS.find((m) => m.key.startsWith("Computer Science")) || MAJORS[0];
  if (contains("nurs")) return MAJORS.find((m) => m.key.startsWith("Nursing")) || MAJORS[0];
  if (contains("finance") || contains("econ")) return MAJORS.find((m) => m.key.startsWith("Finance")) || MAJORS[0];
  if (contains("market")) return MAJORS.find((m) => m.key.startsWith("Marketing")) || MAJORS[0];

  // Default fallback:
  return MAJORS[0];
}

export function pickCity(key) {
  return CITIES.find((c) => c.key === key) || CITIES[0];
}

export function pickSchoolType(key) {
  return SCHOOL_TYPES.find((s) => s.key === key) || SCHOOL_TYPES[0];
}

export function pickLifestyle(key) {
  return LIFESTYLES.find((l) => l.key === key) || LIFESTYLES[1]; // Normal
}
