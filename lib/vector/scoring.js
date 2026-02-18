// lib/vector/scoring.js
import { ROLE_ONTOLOGY, TASK_KEYS } from "./roles";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function dot(a, b) {
  let s = 0;
  for (const k of TASK_KEYS) s += (a[k] ?? 0) * (b[k] ?? 0);
  return s;
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

function cosineSim(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  return dot(a, b) / (na * nb);
}

function normalizeSkillSet(skills = []) {
  // skills may be [{name, w}] or ["Excel", "SQL"]
  const map = new Map();
  for (const s of skills) {
    const name = typeof s === "string" ? s : s?.name;
    if (!name) continue;
    map.set(String(name).toLowerCase().trim(), s);
  }
  return map;
}

function scoreSkillCoverage(userSkills = [], roleSkills = []) {
  const u = normalizeSkillSet(userSkills);
  let covered = 0;
  let total = 0;
  let missingCritical = 0;

  for (const rs of roleSkills) {
    const key = String(rs.name).toLowerCase().trim();
    const w = clamp(Number(rs.w ?? 0.5), 0, 1);
    total += w;
    const has = u.has(key);
    if (has) covered += w;
    else if (rs.critical) missingCritical += 1;
  }

  const coverage = total ? covered / total : 0.5;
  const criticalPenalty = clamp(missingCritical * 0.12, 0, 0.45);

  return {
    coverage, // 0..1
    missingCritical,
    score01: clamp(coverage - criticalPenalty, 0, 1),
  };
}

function seniorityPenalty(userSeniority, roleBands = []) {
  if (!userSeniority || !roleBands?.length) return 0.05; // slight uncertainty
  const u = String(userSeniority).toLowerCase();
  const bands = roleBands.map((x) => String(x).toLowerCase());

  // if included -> no penalty
  if (bands.includes(u)) return 0;

  // if far off -> bigger penalty
  const order = ["entry", "mid", "senior", "manager", "director", "executive"];
  const ui = order.indexOf(u);
  const ri = Math.round((order.indexOf(bands[0]) + order.indexOf(bands[bands.length - 1])) / 2);
  if (ui < 0 || ri < 0) return 0.10;

  const dist = Math.abs(ui - ri);
  return clamp(dist * 0.08, 0.08, 0.40);
}

function preferenceScore01(role, prefs) {
  // V1: sector preference + remote/onsite constraint handled as hard filters elsewhere
  const prefSectors = (prefs?.acceptableSectors || []).map((x) => String(x).toLowerCase());
  if (!prefSectors.length) return 0.65;
  const hit = prefSectors.includes(String(role.sector).toLowerCase());
  return hit ? 0.85 : 0.40;
}

function resilienceScore01(role) {
  // Convert baseline exposure 0..10 into resilience 0..1
  const exposure = clamp(Number(role.automation_exposure_baseline ?? 5), 0, 10);
  const base = 1 - exposure / 10;

  const wc = role.work_context || {};
  const structural =
    0.30 * clamp(wc.embodiment ?? 0.3, 0, 1) +
    0.22 * clamp(wc.liability ?? 0.3, 0, 1) +
    0.18 * clamp(wc.trustDepth ?? 0.3, 0, 1) +
    0.15 * clamp(wc.realTimeLoad ?? 0.3, 0, 1) +
    0.15 * clamp(wc.regulatory ?? 0.3, 0, 1);

  // compression overlay reduces resilience
  const comp = role.compression_overlay || {};
  const compression = clamp((Number(comp.score ?? 50) / 100), 0, 1);
  const momentum = clamp((Number(comp.momentum_60d ?? 0) / 25), 0, 1); // 0..~1

  // penalize high compression + accelerating momentum
  const penalty = 0.35 * compression + 0.25 * momentum;

  return clamp(0.55 * base + 0.45 * structural - penalty, 0, 1);
}

function economicsScore01(role, constraints) {
  // V1 uses the role income band vs target band
  const targetLow = Number(constraints?.salaryMin ?? 0);
  const targetHigh = Number(constraints?.salaryMax ?? 0);

  const inc = role.income || {};
  const mid = Number(inc.mid ?? 0);
  const low = Number(inc.low ?? mid * 0.8);
  const high = Number(inc.high ?? mid * 1.2);

  if (!targetLow && !targetHigh) return 0.60;

  // simple: if role band overlaps target band -> good
  const tL = targetLow || 0;
  const tH = targetHigh || 9999999;

  const overlap = Math.max(0, Math.min(high, tH) - Math.max(low, tL));
  const denom = Math.max(1, Math.min(high, tH) - Math.min(low, tL));
  const overlap01 = clamp(overlap / denom, 0, 1);

  // If role mid is far below min target, penalize
  const below = tL && mid < tL ? clamp((tL - mid) / Math.max(1, tL), 0, 1) : 0;

  return clamp(overlap01 - 0.35 * below, 0, 1);
}

function frictionEase01(role, user) {
  // V1: derived from missing critical skills + retrain willingness + timeline
  const { missingCritical } = scoreSkillCoverage(user.skills || [], role.skills || []);
  const retrain = clamp(Number(user?.constraints?.retrainWillingness ?? 0.5), 0, 1); // 0..1
  const timeline = String(user?.constraints?.timeline || "6-12");
  const timeFactor =
    timeline.includes("0-3") ? 0.25 :
    timeline.includes("3-6") ? 0.45 :
    timeline.includes("6-12") ? 0.65 :
    0.75;

  const penalty = clamp(missingCritical * 0.14, 0, 0.70);
  const ease = clamp(0.75 * timeFactor + 0.25 * retrain - penalty, 0, 1);
  return ease;
}

export function recommendVector({
  userTaskVector,
  userSkills,
  userSeniority,
  constraints,
  stabilityVsUpside = 0.6, // 0..1 (0=upside, 1=stability)
  acceptableSectors = [],
  avoidSectors = [],
}) {
  const prefs = { acceptableSectors };

  // dynamic weights (slider)
  // stability pushes Resilience + Ease higher; upside pushes Economics higher
  const wFit = 0.30;
  const wRes = clamp(0.28 + 0.12 * stabilityVsUpside, 0.28, 0.40);
  const wEcon = clamp(0.30 - 0.16 * stabilityVsUpside, 0.12, 0.30);
  const wEase = clamp(0.12 + 0.10 * stabilityVsUpside, 0.12, 0.22);

  const avoid = new Set((avoidSectors || []).map((x) => String(x).toLowerCase()));
  const accept = new Set((acceptableSectors || []).map((x) => String(x).toLowerCase()));

  const user = { skills: userSkills || [], constraints: constraints || {} };

  const scored = [];
  for (const role of ROLE_ONTOLOGY) {
    const sector = String(role.sector || "").toLowerCase();
    if (avoid.has(sector)) continue;
    if (accept.size && !accept.has(sector)) continue;

    // Hard constraints (V1)
    const salaryMin = Number(constraints?.salaryMin ?? 0);
    if (salaryMin && Number(role?.income?.high ?? 0) < salaryMin) continue;

    // Subscores
    const taskSim = cosineSim(userTaskVector, role.task_vector);
    const skill = scoreSkillCoverage(userSkills, role.skills);
    const seniorPenalty = seniorityPenalty(userSeniority, role.seniority_bands);
    const pref = preferenceScore01(role, prefs);

    const fit01 = clamp(
      0.55 * taskSim +
        0.35 * skill.score01 +
        0.10 * pref -
        0.25 * seniorPenalty,
      0,
      1
    );

    const res01 = resilienceScore01(role);
    const econ01 = economicsScore01(role, constraints);
    const ease01 = frictionEase01(role, user);

    const final01 = clamp(wFit * fit01 + wRes * res01 + wEcon * econ01 + wEase * ease01, 0, 1);

    // Explain drivers (top 3)
    const drivers = [];
    if (taskSim >= 0.65) drivers.push("High task overlap with your weekly work");
    if (skill.missingCritical === 0 && skill.coverage >= 0.65) drivers.push("Strong skill coverage (low critical gaps)");
    if (res01 >= 0.65) drivers.push("Structural resilience signals (liability/embodiment/trust/regulatory)");
    if (econ01 >= 0.65) drivers.push("Income band aligns with your target");
    if (ease01 >= 0.65) drivers.push("Low transition friction under your timeline/retrain tolerance");
    if (!drivers.length) drivers.push("Balanced fit/resilience under your constraints");

    // Skill gaps
    const userSkillSet = new Set((userSkills || []).map((s) => String(typeof s === "string" ? s : s?.name).toLowerCase().trim()));
    const missing = (role.skills || [])
      .filter((s) => s?.name && !userSkillSet.has(String(s.name).toLowerCase().trim()))
      .slice(0, 6)
      .map((s) => ({ name: s.name, critical: !!s.critical }));

    // Simple action plan
    const plan = [
      `Rewrite your resume around the top 3 overlapping tasks for "${role.titles?.[0] || "this role"}".`,
      `Close 1–2 skill gaps: ${missing.slice(0, 2).map((m) => m.name).join(", ") || "role-specific tools"}.`,
      `Build a proof project (case study) that demonstrates outcomes for this role.`,
      `Apply via ATS feeds + targeted companies, track interviews and iterate weekly.`,
    ].slice(0, 5);

    scored.push({
      role_id: role.role_id,
      title: role.titles?.[0] || "Role",
      sector: role.sector,
      fit: Math.round(fit01 * 100),
      resilience: Math.round(res01 * 100),
      economics: Math.round(econ01 * 100),
      ease: Math.round(ease01 * 100),
      final: Math.round(final01 * 100),
      income: role.income,
      time_to_transition: constraints?.timeline || "6-12 months",
      transition_difficulty: ease01 >= 0.7 ? "Low" : ease01 >= 0.5 ? "Medium" : "High",
      why: drivers.slice(0, 3),
      skill_gaps: missing,
      plan,
      explain: {
        weights: { wFit, wRes, wEcon, wEase },
        subscores: { taskSim: Math.round(taskSim * 100), skillCoverage: Math.round(skill.coverage * 100) },
        compression: role.compression_overlay || null,
        exposure_baseline: role.automation_exposure_baseline,
      },
      // used for live listings query
      aliases: role.aliases || [],
    });
  }

  // Sort + select 5–10
  scored.sort((a, b) => b.final - a.final);
  const top = scored.slice(0, 10);
  return top.length ? top : scored.slice(0, 5);
}
