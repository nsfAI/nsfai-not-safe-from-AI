// app/roi/benchmarks.js
// NOTE: These are "benchmark estimates" (not scraped live data).
// They are meant to be directionally accurate and internally consistent.
// Users can override in Advanced mode for precision.

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Education tracks:
 * - undergrad: 4 years (default)
 * - professional_md: 8 total years (4 undergrad + 4 med)
 * - professional_jd: 7 total years (4 undergrad + 3 law)
 * - professional_mba: 6 total years (4 undergrad + 2 mba)
 * - professional_dental: 8 total (4 + 4)
 * - professional_pharmd: 6 total (2 pre + 4 pharmd; simplified)
 * - graduate_ms: 6 total (4 + 2)
 */
export const MAJORS = [
  // ---------- Undergrad / General ----------
  {
    key: "Accounting (BS)",
    track: "undergrad",
    startSalary: 65000,
    growth: 0.038,
    plateauYear: 18,
    plateauGrowth: 0.02,
    aiExposure: 6,
    notes: "Stable demand, but junior layers compress first. Upside: advisory/FP&A/controls ownership.",
    aliases: ["accounting", "bs accounting", "bachelors accounting"],
  },
  {
    key: "Finance (BS)",
    track: "undergrad",
    startSalary: 70000,
    growth: 0.04,
    plateauYear: 18,
    plateauGrowth: 0.02,
    aiExposure: 6,
    notes: "Many tasks are screen-based/templated. Advantage shifts to judgment, client trust, and narrative.",
    aliases: ["finance", "bs finance", "bachelors finance"],
  },
  {
    key: "Computer Science (BS)",
    track: "undergrad",
    startSalary: 95000,
    growth: 0.05,
    plateauYear: 16,
    plateauGrowth: 0.02,
    aiExposure: 7,
    notes: "Output-per-head rising fast. Winners become AI-native builders with product sense + systems thinking.",
    aliases: ["computer science", "cs", "software engineering", "swe"],
  },
  {
    key: "Nursing (BSN)",
    track: "undergrad",
    startSalary: 82000,
    growth: 0.04,
    plateauYear: 18,
    plateauGrowth: 0.02,
    aiExposure: 3,
    notes: "Embodiment + liability create resistance. AI augments documentation/triage; core remains physical/trust-heavy.",
    aliases: ["nursing", "bsn", "rn"],
  },
  {
    key: "Mechanical Engineering (BS)",
    track: "undergrad",
    startSalary: 80000,
    growth: 0.04,
    plateauYear: 18,
    plateauGrowth: 0.02,
    aiExposure: 5,
    notes: "Design + manufacturing still physical-world constrained. AI speeds design loops; execution still gated by reality.",
    aliases: ["mechanical engineering", "mech e", "me"],
  },
  {
    key: "Psychology (BA)",
    track: "undergrad",
    startSalary: 45000,
    growth: 0.03,
    plateauYear: 18,
    plateauGrowth: 0.015,
    aiExposure: 4,
    notes: "Undergrad alone often low ROI; ROI increases if paired with a licensure path (therapy/clinical).",
    aliases: ["psychology", "psych", "ba psychology"],
  },

  // ---------- Graduate / Professional ----------
  {
    key: "Medicine (MD/DO)",
    track: "professional_md",
    // attending start salary (post-training). We separately model "training years" with a trainingSalary.
    attendingStartSalary: 240000,
    trainingSalary: 65000, // residency typical ballpark
    trainingYears: 4,
    growth: 0.03,
    plateauYear: 20,
    plateauGrowth: 0.015,
    aiExposure: 1,
    notes: "High liability + embodiment. AI augments diagnostics/admin; core decisions + procedures remain sticky.",
    aliases: ["medical school", "medicine", "md", "do", "doctor", "physician"],
  },
  {
    key: "Law (JD)",
    track: "professional_jd",
    startSalary: 90000, // highly variable; this is a baseline.
    growth: 0.03,
    plateauYear: 20,
    plateauGrowth: 0.015,
    aiExposure: 5,
    notes: "Research/briefing compress; courtroom/client trust/strategy persists. Outcomes are prestige/market dependent.",
    aliases: ["law school", "law", "jd", "juris doctor", "attorney"],
  },
  {
    key: "MBA (General)",
    track: "professional_mba",
    startSalary: 120000,
    growth: 0.035,
    plateauYear: 18,
    plateauGrowth: 0.02,
    aiExposure: 6,
    notes: "ROI is network + optionality. AI compresses analysis/pitch decks; advantage shifts to leadership + decision rights.",
    aliases: ["mba", "business school"],
  },
  {
    key: "Dental (DDS/DMD)",
    track: "professional_dental",
    attendingStartSalary: 180000,
    trainingSalary: 0,
    trainingYears: 0,
    growth: 0.03,
    plateauYear: 22,
    plateauGrowth: 0.015,
    aiExposure: 2,
    notes: "Embodiment + procedure-based work. Tech augments imaging/ops; hands-on delivery stays human.",
    aliases: ["dental school", "dentistry", "dds", "dmd", "dentist"],
  },
  {
    key: "Pharmacy (PharmD)",
    track: "professional_pharmd",
    startSalary: 115000,
    growth: 0.025,
    plateauYear: 20,
    plateauGrowth: 0.01,
    aiExposure: 4,
    notes: "Some commoditization pressure. Advantage shifts to clinical specialization + settings with higher complexity.",
    aliases: ["pharmacy", "pharmd", "pharmacist"],
  },
  {
    key: "MS in Data/Analytics",
    track: "graduate_ms",
    startSalary: 110000,
    growth: 0.04,
    plateauYear: 18,
    plateauGrowth: 0.02,
    aiExposure: 7,
    notes: "Fast productivity acceleration. Differentiation: domain depth + decision impact + owning pipelines end-to-end.",
    aliases: ["masters data", "ms data", "analytics masters", "data science masters", "ms analytics"],
  },
];

export const CITIES = [
  {
    key: "New York, NY",
    salaryMult: 1.0,
    livingSchool: 32000,
    livingAfter: 46000,
    taxRate: 0.30,
    notes: "High cost, high density opportunity. Taxes + rent bite hard; comp must clear the bar.",
  },
  {
    key: "San Francisco, CA",
    salaryMult: 1.1,
    livingSchool: 36000,
    livingAfter: 52000,
    taxRate: 0.32,
    notes: "Highest ceiling for tech; expensive living. Great for compounding if trajectory is strong.",
  },
  {
    key: "Los Angeles, CA",
    salaryMult: 1.0,
    livingSchool: 32000,
    livingAfter: 47000,
    taxRate: 0.30,
    notes: "High housing drag. Outcomes vary strongly by industry and network effects.",
  },
  {
    key: "Dallas, TX",
    salaryMult: 0.9,
    livingSchool: 22000,
    livingAfter: 32000,
    taxRate: 0.22,
    notes: "Lower taxes and cost-of-living. Lower salary ceiling but better savings rate potential.",
  },
  {
    key: "Chicago, IL",
    salaryMult: 0.95,
    livingSchool: 26000,
    livingAfter: 38000,
    taxRate: 0.27,
    notes: "Balanced city economics. Strong for finance/ops; costs moderate vs coastal hubs.",
  },
];

export const LIFESTYLES = [
  { key: "Frugal", livingMult: 0.85 },
  { key: "Normal", livingMult: 1.0 },
  { key: "High", livingMult: 1.25 },
];

// Tuition tiers: undergrad vs professional (med/law/mba/etc)
export const SCHOOL_TYPES = [
  // Undergrad
  { key: "In-State Public (UG)", tier: "undergrad", tuitionPerYear: 12000 },
  { key: "Out-of-State Public (UG)", tier: "undergrad", tuitionPerYear: 28000 },
  { key: "Private (UG)", tier: "undergrad", tuitionPerYear: 52000 },

  // Professional / Graduate (rough estimates)
  { key: "Public (Professional/Grad)", tier: "professional", tuitionPerYear: 45000 },
  { key: "Private (Professional/Grad)", tier: "professional", tuitionPerYear: 65000 },
];

function trackYears(track) {
  switch (track) {
    case "professional_md":
      return 8; // 4 UG + 4 med
    case "professional_jd":
      return 7; // 4 UG + 3 law
    case "professional_mba":
      return 6; // 4 UG + 2 MBA
    case "professional_dental":
      return 8;
    case "professional_pharmd":
      return 6;
    case "graduate_ms":
      return 6;
    case "undergrad":
    default:
      return 4;
  }
}

// For professional tracks, we want the professional tier by default
function defaultTier(track) {
  return track === "undergrad" ? "undergrad" : "professional";
}

export function pickMajor(freeText, benchmarkKey) {
  const t = norm(freeText);
  let match = null;

  if (t.length) {
    for (const m of MAJORS) {
      const aliases = [m.key, ...(m.aliases || [])].map(norm);
      if (aliases.some((a) => a && (t === a || t.includes(a) || a.includes(t)))) {
        match = m;
        break;
      }
    }
  }

  const byKey = MAJORS.find((m) => m.key === benchmarkKey) || MAJORS[0];

  // Sanity guardrail:
  // If freeText matches something meaningful, we trust it (prevents "Medical School" using Nursing benchmark).
  const chosen = match || byKey;

  return {
    ...chosen,
    yearsInSchoolDefault: trackYears(chosen.track),
    tuitionTierDefault: defaultTier(chosen.track),
  };
}

export function pickCity(key) {
  return CITIES.find((c) => c.key === key) || CITIES[0];
}

export function pickSchoolType(key) {
  return SCHOOL_TYPES.find((s) => s.key === key) || SCHOOL_TYPES[0];
}

export function pickLifestyle(key) {
  return LIFESTYLES.find((l) => l.key === key) || LIFESTYLES[1];
}

export function resolveAutoTuition(major, schoolType) {
  const tierWanted = major.tuitionTierDefault;
  const s = SCHOOL_TYPES.find((x) => x.key === schoolType);

  // If user picked UG school type but major is professional → auto-correct tier selection
  if (!s) {
    const fallback = SCHOOL_TYPES.find((x) => x.tier === tierWanted) || SCHOOL_TYPES[0];
    return { tuitionPerYear: fallback.tuitionPerYear, correctedSchoolTypeKey: fallback.key };
  }

  if (s.tier !== tierWanted) {
    const corrected = SCHOOL_TYPES.find((x) => x.tier === tierWanted) || s;
    return { tuitionPerYear: corrected.tuitionPerYear, correctedSchoolTypeKey: corrected.key };
  }

  return { tuitionPerYear: s.tuitionPerYear, correctedSchoolTypeKey: s.key };
}

export function clamp01(x) {
  return clamp(x, 0, 1);
}
