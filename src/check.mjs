/**
 * The assessment logic, kept free of process/CLI concerns so it can be tested
 * directly rather than by scraping terminal output.
 *
 * The one rule this module exists to enforce: DECLARED and VERIFIED are
 * different kinds of thing and are never combined into a score.
 *
 *   DECLARED   a human asserted it and signed their name to the assertion
 *   VERIFIED   a read-only command ran and its output is attached
 *
 * A tool that merges those is laundering an opinion into evidence, and almost
 * every control here can only ever be attested by a human. So `counts` reports
 * both and there is deliberately no field that adds them.
 */

import { CONTROLS, STATUSES, SOURCE } from "./controls.mjs";

export const VERSION = "0.1.0";

/** A config template with every control present and honestly unknown. */
export function templateConfig() {
  return {
    $schema: `${SOURCE}#agentcheck-config`,
    agent: "name-of-your-agent",
    environment: "production",
    assessor: "your.name@example.com",
    controls: Object.fromEntries(
      CONTROLS.map((c) => [c.id, { status: "unknown", evidence: "", note: "" }])
    ),
  };
}

/**
 * Assess a config.
 *
 * @param {object}   config    parsed agentcheck.config.json
 * @param {object}   [opts]
 * @param {function} [opts.runner]  (command) => {ran, ok, output, error}.
 *                                  Omit to execute nothing — the default is to
 *                                  run nothing against anyone's infrastructure.
 * @returns {object} the evidence pack
 */
export function assess(config, opts = {}) {
  const { runner = null } = opts;
  const declaredFor = (id) => config?.controls?.[id] ?? {};

  const results = CONTROLS.map((c) => {
    const d = declaredFor(c.id);
    const status = STATUSES.includes(d.status) ? d.status : "unknown";

    const r = {
      id: c.id,
      wave: c.wave,
      title: c.title,
      asks: c.asks,
      declared: status,
      evidence: d.evidence || "",
      note: d.note || "",
      verified: null,
    };

    if (c.check) {
      if (c.check.run && runner) {
        const out = runner(c.check.run);
        r.verified = { platform: c.check.platform, command: c.check.run, expect: c.check.expect, ...out };
      } else {
        r.verified = {
          platform: c.check.platform,
          command: c.check.run,
          expect: c.check.expect,
          ran: false,
          reason: c.check.run
            ? "not executed — pass --run"
            : "no portable command; this one is environment-specific by nature",
        };
      }
    }
    return r;
  });

  /* A control claimed met whose prerequisite is not met is the most common way
     one of these packs is quietly wrong. Tool authorisation cannot be met if
     the agent has no identity of its own to authorise. */
  const met = new Set(results.filter((r) => r.declared === "met").map((r) => r.id));
  for (const c of CONTROLS) {
    const unmet = (c.needs ?? []).filter((n) => !met.has(n));
    const r = results.find((x) => x.id === c.id);
    if (r.declared === "met" && unmet.length) r.prerequisiteGap = unmet;
  }

  const counts = {
    met: results.filter((r) => r.declared === "met").length,
    notMet: results.filter((r) => r.declared === "not-met").length,
    notApplicable: results.filter((r) => r.declared === "not-applicable").length,
    unknown: results.filter((r) => r.declared === "unknown").length,
    /* Only a command that RAN and SUCCEEDED counts. A failed check is not
       evidence of anything and must never move this number. */
    verifiedByCommand: results.filter((r) => r.verified?.ran && r.verified.ok).length,
    failedChecks: results.filter((r) => r.verified?.ran && !r.verified.ok).length,
    gaps: results.filter((r) => r.prerequisiteGap).length,
    missingEvidence: results.filter((r) => r.declared === "met" && !r.evidence).length,
  };

  return {
    tool: "agentcheck",
    version: VERSION,
    agent: config?.agent ?? "",
    environment: config?.environment ?? "",
    assessor: config?.assessor ?? "",
    controls_source: SOURCE,
    controls_license: "CC BY 4.0",
    honesty:
      "DECLARED counts are human assertions, not measurements. VERIFIED counts are read-only commands that ran with output attached. They are reported separately and must not be summed.",
    counts,
    results,
  };
}

/**
 * Non-zero only when the pack is not defensible. An honest "unknown" passes —
 * unknown is the correct starting state, and a tool that punishes it teaches
 * people to guess.
 */
export function exitCodeFor(pack) {
  return pack.counts.missingEvidence || pack.counts.gaps ? 1 : 0;
}

export function markdown(pack, generated) {
  const L = [];
  L.push(`# Agent evidence pack — ${pack.agent}`, "");
  L.push(`- **Environment:** ${pack.environment}`);
  L.push(`- **Assessor:** ${pack.assessor}`);
  if (generated) L.push(`- **Generated:** ${generated}`);
  L.push(`- **Controls:** [${pack.controls_source}](${pack.controls_source}) (CC BY 4.0)`, "");
  L.push(`> ${pack.honesty}`, "");
  L.push(
    `**Declared:** ${pack.counts.met} met · ${pack.counts.notMet} not met · ${pack.counts.notApplicable} n/a · ${pack.counts.unknown} unknown  `
  );
  L.push(`**Verified by a command that ran:** ${pack.counts.verifiedByCommand}`, "");

  for (const w of [1, 2]) {
    L.push(`## Wave ${w}`, "");
    for (const r of pack.results.filter((x) => x.wave === w)) {
      L.push(`### ${r.title}`, "");
      L.push(
        `- **Declared:** \`${r.declared}\`${r.evidence ? ` — evidence: ${r.evidence}` : " — _no evidence recorded_"}`
      );
      if (r.note) L.push(`- **Note:** ${r.note}`);
      if (r.prerequisiteGap)
        L.push(`- **⚠ Prerequisite gap:** claimed met but depends on ${r.prerequisiteGap.join(", ")}`);
      if (r.verified?.ran) {
        L.push(`- **Verified:** \`${r.verified.command}\``);
        L.push("", "```", (r.verified.output || r.verified.error || "").slice(0, 1200), "```");
      } else if (r.verified) {
        L.push(`- **Not verified:** ${r.verified.reason}`);
      }
      L.push("");
    }
  }
  return L.join("\n") + "\n";
}
