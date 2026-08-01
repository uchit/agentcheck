/**
 * Tests for the assessment logic.
 *
 * These are not coverage theatre. Every case here is a specific way this tool
 * could quietly lie to someone about their agent deployment, and each one is
 * asserted against directly.
 *
 * Run: npm test   (node:test, no dependencies)
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTROLS } from "../src/controls.mjs";
import { assess, exitCodeFor, markdown, templateConfig } from "../src/check.mjs";

const cfg = (controls = {}) => ({
  agent: "test-agent",
  environment: "test",
  assessor: "test@example.com",
  controls,
});
const all = (status, evidence = "") =>
  Object.fromEntries(CONTROLS.map((c) => [c.id, { status, evidence, note: "" }]));

/* ------------------------------------------------------------- structure */

test("the control set is internally consistent", () => {
  const ids = new Set(CONTROLS.map((c) => c.id));
  assert.equal(ids.size, CONTROLS.length, "control ids must be unique");

  for (const c of CONTROLS) {
    for (const n of c.needs ?? []) {
      assert.ok(ids.has(n), `${c.id} needs unknown control ${n}`);
      assert.notEqual(n, c.id, `${c.id} depends on itself`);
      const dep = CONTROLS.find((x) => x.id === n);
      assert.ok(dep.wave < c.wave, `${c.id} (wave ${c.wave}) needs ${n} (wave ${dep.wave}) — a prerequisite must be in an earlier wave`);
    }
  }
});

test("wave 1 controls have no prerequisites", () => {
  for (const c of CONTROLS.filter((x) => x.wave === 1)) {
    assert.equal((c.needs ?? []).length, 0, `${c.id} is wave 1 but has prerequisites`);
  }
});

test("the template declares every control as unknown", () => {
  const t = templateConfig();
  assert.equal(Object.keys(t.controls).length, CONTROLS.length);
  for (const c of CONTROLS) assert.equal(t.controls[c.id].status, "unknown");
});

/* ------------------------------------------------- declared vs verified */

test("an all-unknown pack passes — unknown is a valid starting state", () => {
  const pack = assess(cfg(all("unknown")));
  assert.equal(pack.counts.unknown, CONTROLS.length);
  assert.equal(exitCodeFor(pack), 0);
});

test("declared and verified are never summed into a score", () => {
  const pack = assess(cfg(all("met", "s3://evidence")));
  assert.equal(pack.counts.met, CONTROLS.length);
  assert.equal(pack.counts.verifiedByCommand, 0, "nothing ran, so nothing is verified");
  /* The absence of a combined field is the contract. */
  const keys = Object.keys(pack.counts);
  for (const k of keys) {
    assert.ok(!/^(score|total|overall|percent|grade)/i.test(k), `counts must not expose an aggregate score: found ${k}`);
  }
});

test("a command that runs and succeeds increments verified", () => {
  const runner = () => ({ ran: true, ok: true, output: "arn:aws:sts::1:assumed-role/agent/x" });
  const pack = assess(cfg(all("unknown")), { runner });
  assert.equal(pack.counts.verifiedByCommand, 1, "exactly one control has a runnable command");
  assert.equal(pack.counts.failedChecks, 0);
});

test("a command that runs and FAILS does not increment verified", () => {
  const runner = () => ({ ran: true, ok: false, output: "", error: "InvalidClientTokenId" });
  const pack = assess(cfg(all("unknown")), { runner });
  assert.equal(pack.counts.verifiedByCommand, 0, "a failed check is not evidence of anything");
  assert.equal(pack.counts.failedChecks, 1);
});

test("nothing executes unless a runner is supplied", () => {
  let called = 0;
  assess(cfg(all("unknown")));                       // no runner
  assess(cfg(all("unknown")), { runner: undefined }); // explicit undefined
  assert.equal(called, 0);
  const pack = assess(cfg(all("unknown")));
  const withCmd = pack.results.filter((r) => r.verified && r.verified.command);
  assert.ok(withCmd.length > 0);
  for (const r of withCmd) assert.equal(r.verified.ran, false);
});

/* --------------------------------------------------------- failure modes */

test("claiming met with no evidence fails the pack", () => {
  const pack = assess(cfg({ ...all("unknown"), "agent-identity": { status: "met", evidence: "" } }));
  assert.equal(pack.counts.missingEvidence, 1);
  assert.equal(exitCodeFor(pack), 1);
});

test("claiming met WITH evidence does not fail the pack", () => {
  const pack = assess(cfg({ ...all("unknown"), "agent-identity": { status: "met", evidence: "s3://iam-export.json" } }));
  assert.equal(pack.counts.missingEvidence, 0);
  assert.equal(exitCodeFor(pack), 0);
});

test("a control claimed met while its prerequisite is not met is flagged", () => {
  const pack = assess(
    cfg({
      ...all("unknown"),
      "agent-identity": { status: "not-met", evidence: "" },
      "agent-tool-authz": { status: "met", evidence: "git://tools.yaml" },
    })
  );
  const authz = pack.results.find((r) => r.id === "agent-tool-authz");
  assert.deepEqual(authz.prerequisiteGap, ["agent-identity"]);
  assert.equal(pack.counts.gaps, 1);
  assert.equal(exitCodeFor(pack), 1);
});

test("a prerequisite left UNKNOWN also counts as a gap", () => {
  const pack = assess(
    cfg({ ...all("unknown"), "agent-blast-radius": { status: "met", evidence: "k8s://quota" } })
  );
  assert.equal(pack.counts.gaps, 1, "unknown is not met, so the gap stands");
  assert.equal(exitCodeFor(pack), 1);
});

test("a satisfied prerequisite clears the gap", () => {
  const pack = assess(
    cfg({
      ...all("unknown"),
      "agent-identity": { status: "met", evidence: "s3://iam.json" },
      "agent-blast-radius": { status: "met", evidence: "k8s://quota" },
    })
  );
  assert.equal(pack.counts.gaps, 0);
  assert.equal(exitCodeFor(pack), 0);
});

test("not-applicable does not create prerequisite gaps downstream", () => {
  const pack = assess(cfg(all("not-applicable")));
  assert.equal(pack.counts.notApplicable, CONTROLS.length);
  assert.equal(pack.counts.gaps, 0, "nothing is claimed met, so nothing can rest on an unmet prerequisite");
  assert.equal(exitCodeFor(pack), 0);
});

/* -------------------------------------------------------------- hygiene */

test("an unrecognised status is treated as unknown, not silently accepted", () => {
  const pack = assess(cfg({ ...all("unknown"), "agent-identity": { status: "definitely-fine", evidence: "" } }));
  const r = pack.results.find((x) => x.id === "agent-identity");
  assert.equal(r.declared, "unknown");
  assert.equal(exitCodeFor(pack), 0);
});

test("a config missing controls entirely still assesses every control", () => {
  const pack = assess({ agent: "x" });
  assert.equal(pack.results.length, CONTROLS.length);
  assert.equal(pack.counts.unknown, CONTROLS.length);
});

test("the honesty statement is carried in the pack itself", () => {
  const pack = assess(cfg(all("met", "e")));
  assert.match(pack.honesty, /must not be summed/i);
  assert.equal(pack.controls_license, "CC BY 4.0");
});

test("the markdown report attaches real command output", () => {
  const runner = () => ({ ran: true, ok: true, output: "arn:aws:sts::123:assumed-role/agent-x/session" });
  const pack = assess(cfg(all("unknown")), { runner });
  const md = markdown(pack, "2026-08-02T00:00:00Z");
  assert.match(md, /assumed-role\/agent-x/, "command output must appear in the report");
  assert.match(md, /must not be summed/i, "the honesty note travels with the report");
});

test("the markdown report marks a met control with no evidence", () => {
  const pack = assess(cfg({ ...all("unknown"), "agent-identity": { status: "met", evidence: "" } }));
  const md = markdown(pack);
  assert.match(md, /_no evidence recorded_/);
});
