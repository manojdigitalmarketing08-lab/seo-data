// Deterministic stand-in for the multi-angle seed brainstorming in the
// seo-keyword-page-planner skill (which relies on an LLM doing this
// creatively). Template-based, so coverage is narrower than the skill's
// judgment-driven version, but it's what's achievable without an LLM call.
const ANGLE_TEMPLATES = {
  core: (t) => [t],
  problem: (t) => [`how to ${t}`, `${t} problems`, `why ${t}`],
  feature: (t) => [`best ${t}`, `free ${t}`, `${t} features`],
  comparison: (t) => [`${t} vs`, `${t} alternative`, `top ${t}`],
  commercial: (t) => [`${t} pricing`, `${t} cost`, `buy ${t}`],
  longtail: (t) => [`what is ${t}`, `how does ${t} work`, `does ${t} work`, `why use ${t}`, `who needs ${t}`]
};

// Commercial-intent seeds ("pricing", "buy") don't fit a purely informational
// page, so they're dropped when the caller says so — same rule as Phase 1 of
// the skill this is modeled on.
function generateSeeds(topic, intent) {
  const angles = ['core', 'problem', 'feature', 'comparison', 'longtail'];
  if (intent !== 'informational') angles.push('commercial');

  const seeds = new Set();
  angles.forEach((angle) => ANGLE_TEMPLATES[angle](topic).forEach((s) => seeds.add(s)));
  return Array.from(seeds);
}

module.exports = { generateSeeds };
