'use strict';

const SEVERITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function compileRules(rules) {
  return rules
    .filter((r) => r && r.isActive)
    .map((r) => {
      try {
        return { id: r.id, name: r.name, pattern: r.pattern, flags: r.flags || 'i', category: r.category, severity: r.severity, re: new RegExp(r.pattern, r.flags || 'i') };
      } catch (e) {
        console.warn(`[classifier] skipping invalid rule "${r.name}": ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

function classify(message, compiled) {
  let best = null;
  for (const rule of compiled) {
    if (!rule.re.test(message)) continue;
    if (!best || SEVERITY_RANK[rule.severity] > SEVERITY_RANK[best.severity] || (SEVERITY_RANK[rule.severity] === SEVERITY_RANK[best.severity] && rule.id < best.id)) {
      best = rule;
    }
  }
  if (!best) return { category: null, ruleId: null, severity: null };
  return { category: best.category, ruleId: best.id, severity: best.severity };
}

module.exports = { compileRules, classify };
