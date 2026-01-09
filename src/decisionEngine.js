function clamp(n, min, max) {
  const v = Math.round(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

function toNumberOrNull(x) {
  if (x === undefined || x === null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function matchesCondition(data, cond) {
  // field comparisons
  if (cond.field) {
    const val = data?.[cond.field];
    if (Object.prototype.hasOwnProperty.call(cond, "equals")) return val === cond.equals;
    if (Object.prototype.hasOwnProperty.call(cond, "notEquals")) return val !== cond.notEquals;
  }

  // activities include
  if (cond.activitiesInclude) {
    const acts = data?.activities_selected || [];
    return Array.isArray(acts) && acts.includes(cond.activitiesInclude);
  }

  // composite
  if (cond.all) return cond.all.every((c) => matchesCondition(data, c));
  if (cond.any) return cond.any.some((c) => matchesCondition(data, c));

  return false;
}

function matchesNumeric(data, numeric) {
  const n = toNumberOrNull(data?.[numeric.field]);
  if (n === null) return false;

  if (Object.prototype.hasOwnProperty.call(numeric, "gte")) return n >= numeric.gte;
  if (Object.prototype.hasOwnProperty.call(numeric, "gt")) return n > numeric.gt;
  if (Object.prototype.hasOwnProperty.call(numeric, "lte")) return n <= numeric.lte;
  if (Object.prototype.hasOwnProperty.call(numeric, "lt")) return n < numeric.lt;

  return false;
}

function confidenceFromUnknowns(unknowns, table) {
  for (const row of table) {
    if (unknowns <= row.maxUnknowns) return row.label;
  }
  return "Low";
}

function riskBand(score, bands) {
  for (const b of bands) {
    if (score >= b.min) return b.label;
  }
  return "Low";
}

export function evaluateDecision(data, ruleset) {
  const { meta, rulesInOrder, scoring } = ruleset;

  // 1) First-match rules for early exits
  for (const r of rulesInOrder) {
    const ok = (r.whenAll || []).every((c) => matchesCondition(data, c));
    if (ok) {
      const out = r.outcome;
      const confidence = confidenceFromUnknowns(out.unknowns || 0, meta.confidenceByUnknowns);
      return {
        determination: out.determination,
        riskScore: clamp(out.riskScore, 0, meta.riskScoreMax),
        riskBand: riskBand(out.riskScore, meta.riskBands),
        confidence,
        whyText: out.whyText || "",
        nextAction: out.nextAction || "",
        recommendations: out.recommendations || [],
        drivers: out.drivers || []
      };
    }
  }

  // 2) Baseline scoring path (assumes HPZ overlap and habitat present)
  let risk = meta.defaults.baselineRisk;
  let unknowns = 0;
  const drivers = [...(scoring.baselineDrivers || [])];

  // unknown penalties
  for (const u of scoring.unknownPenalties || []) {
    if (matchesCondition(data, u)) {
      unknowns += 1;
      risk += u.points;
      drivers.push({
        label: u.label,
        points: u.points,
        detail: "Critical uncertainty increases screening risk and reduces confidence."
      });
    }
  }

  // High-risk triggers (early return)
  for (const t of scoring.highRiskTriggers || []) {
    const ok = (t.whenAny || []).some((group) => matchesCondition(data, group));
    if (ok) {
      risk += t.addPoints;
      drivers.push({ label: t.label, points: t.addPoints, detail: t.detail });
      const score = clamp(risk, 0, meta.riskScoreMax);
      const confidence = confidenceFromUnknowns(unknowns, meta.confidenceByUnknowns);
      return {
        determination: t.outcome.determination,
        riskScore: score,
        riskBand: riskBand(score, meta.riskBands),
        confidence,
        whyText: t.outcome.whyText || "",
        nextAction: t.outcome.nextAction || "",
        recommendations: scoring.defaultRecommendations || [],
        drivers: drivers.sort((a, b) => (b.points || 0) - (a.points || 0))
      };
    }
  }

  // Conditional triggers (may early return)
  for (const t of scoring.conditionalTriggers || []) {
    const allOk = (t.whenAll || []).every((c) => matchesCondition(data, c));
    const anyOk = (t.whenAny || []).some((c) => matchesCondition(data, c));
    const numericOk = t.numeric ? matchesNumeric(data, t.numeric) : true;

    if (allOk && anyOk && numericOk) {
      risk += t.addPoints;
      drivers.push({ label: t.label, points: t.addPoints, detail: t.detail });
      const score = clamp(risk, 0, meta.riskScoreMax);
      const confidence = confidenceFromUnknowns(unknowns, meta.confidenceByUnknowns);
      return {
        determination: t.outcome.determination,
        riskScore: score,
        riskBand: riskBand(score, meta.riskBands),
        confidence,
        whyText: t.outcome.whyText || "",
        nextAction: t.outcome.nextAction || "",
        recommendations: scoring.defaultRecommendations || [],
        drivers: drivers.sort((a, b) => (b.points || 0) - (a.points || 0))
      };
    }
  }

  // Lower-risk additive items
  for (const a of scoring.lowerRiskAdds || []) {
    const ok = (a.whenAll || []).every((c) => matchesCondition(data, c));
    const numericOk = a.numeric ? matchesNumeric(data, a.numeric) : true;
    if (ok && numericOk) {
      risk += a.addPoints;
      drivers.push({ label: a.label, points: a.addPoints, detail: a.detail });
    }
  }

  const score = clamp(risk, 0, meta.riskScoreMax);
  const confidence = confidenceFromUnknowns(unknowns, meta.confidenceByUnknowns);

  return {
    determination: scoring.defaultOutcome.determination,
    riskScore: score,
    riskBand: riskBand(score, meta.riskBands),
    confidence,
    whyText: scoring.defaultOutcome.whyText || "",
    nextAction: scoring.defaultOutcome.nextAction || "",
    recommendations: scoring.defaultRecommendations || [],
    drivers: drivers.sort((a, b) => (b.points || 0) - (a.points || 0))
  };
}
