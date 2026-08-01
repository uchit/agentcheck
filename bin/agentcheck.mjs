#!/usr/bin/env node
/**
 * agentcheck — CLI.
 *
 * Thin on purpose: argument parsing, file I/O and terminal formatting only.
 * All assessment logic lives in ../src/check.mjs so it can be tested directly
 * rather than by scraping this output.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { assess, exitCodeFor, markdown, templateConfig, VERSION } from "../src/check.mjs";
import { SOURCE } from "../src/controls.mjs";

const DEFAULT_CONFIG = "agentcheck.config.json";
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const C = tty
  ? { dim: "\x1b[2m", b: "\x1b[1m", g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", x: "\x1b[0m" }
  : { dim: "", b: "", g: "", y: "", r: "", x: "" };

function init() {
  const path = opt("--config", DEFAULT_CONFIG);
  if (existsSync(path) && !flag("--force")) {
    console.error(`\n  ${path} already exists. Pass --force to overwrite.\n`);
    process.exit(1);
  }
  writeFileSync(path, JSON.stringify(templateConfig(), null, 2) + "\n", "utf8");
  console.log(`\n  wrote ${path}`);
  console.log(`  ${C.dim}Fill in status + evidence for each control, then: agentcheck check${C.x}\n`);
}

/* Read-only by contract. Only reached when the user passes --run. */
function runCommand(run) {
  try {
    const out = execSync(run, { stdio: "pipe", timeout: 60000, encoding: "utf8" });
    return { ran: true, ok: true, output: String(out).trim().slice(0, 4000) };
  } catch (e) {
    return {
      ran: true,
      ok: false,
      output: String(e.stdout || "").trim().slice(0, 2000),
      error: String(e.stderr || e.message || "").trim().split("\n")[0].slice(0, 400),
    };
  }
}

function check() {
  const path = opt("--config", DEFAULT_CONFIG);
  if (!existsSync(path)) {
    console.error(`\n  no ${path}. Run: agentcheck init\n`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`\n  ${path} is not valid JSON: ${e.message}\n`);
    process.exit(1);
  }

  const doRun = flag("--run");
  const pack = assess(config, { runner: doRun ? runCommand : null });
  pack.generated = new Date().toISOString();

  const jsonOut = opt("--json", null);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(pack, null, 2) + "\n", "utf8");
  const mdOut = opt("--md", null);
  if (mdOut) writeFileSync(mdOut, markdown(pack, pack.generated), "utf8");

  print(pack, { jsonOut, mdOut, doRun });
  process.exit(exitCodeFor(pack));
}

function print(p, o) {
  const n = p.counts;
  console.log(`\n  ${C.b}agentcheck${C.x} ${C.dim}v${VERSION}${C.x}   ${p.agent} ${C.dim}·${C.x} ${p.environment}\n`);

  for (const w of [1, 2]) {
    console.log(`  ${C.dim}wave ${w}${C.x}`);
    for (const r of p.results.filter((x) => x.wave === w)) {
      const mark = {
        met: `${C.g}met${C.x}`,
        "not-met": `${C.r}not met${C.x}`,
        "not-applicable": `${C.dim}n/a${C.x}`,
        unknown: `${C.y}unknown${C.x}`,
      }[r.declared];
      const v = r.verified?.ran
        ? r.verified.ok ? ` ${C.g}[verified]${C.x}` : ` ${C.r}[check failed]${C.x}`
        : "";
      console.log(`    ${r.title.padEnd(46).slice(0, 46)} ${mark}${v}`);
      if (r.prerequisiteGap) console.log(`      ${C.r}↳ claimed met but needs: ${r.prerequisiteGap.join(", ")}${C.x}`);
      if (r.declared === "met" && !r.evidence) console.log(`      ${C.r}↳ claimed met with no evidence recorded${C.x}`);
    }
    console.log("");
  }

  console.log(`  ${C.b}DECLARED${C.x}  ${n.met} met · ${n.notMet} not met · ${n.notApplicable} n/a · ${n.unknown} unknown`);
  console.log(`  ${C.b}VERIFIED${C.x}  ${n.verifiedByCommand} by a command that ran${o.doRun ? "" : `  ${C.dim}(pass --run to execute)${C.x}`}${n.failedChecks ? `  ${C.r}${n.failedChecks} failed${C.x}` : ""}`);
  console.log(`\n  ${C.dim}These are not added together. A declaration is not a measurement.${C.x}`);

  if (n.missingEvidence) console.log(`\n  ${C.r}${n.missingEvidence} control(s) claimed met with no evidence recorded.${C.x}`);
  if (n.gaps) console.log(`  ${C.r}${n.gaps} control(s) claimed met while a prerequisite is not.${C.x}`);
  if (o.jsonOut) console.log(`\n  ${C.dim}evidence pack → ${o.jsonOut}${C.x}`);
  if (o.mdOut) console.log(`  ${C.dim}report        → ${o.mdOut}${C.x}`);
  console.log("");
}

if (cmd === "init") init();
else if (cmd === "check") check();
else if (cmd === "--version" || cmd === "-v") console.log(VERSION);
else {
  console.log(`
  ${C.b}agentcheck${C.x} ${C.dim}v${VERSION}${C.x} — evidence pack for an agent deployment

    agentcheck init                write a config template
    agentcheck check               score it, execute nothing
    agentcheck check --run         also run the read-only checks
    agentcheck check --json p.json write the evidence pack
    agentcheck check --md r.md     write a Markdown report

  Declared and verified are counted separately and never summed.
  Exits non-zero only when a control is claimed met with no evidence,
  or claimed met while a prerequisite is not.

  Controls: ${SOURCE} (CC BY 4.0)
`);
  process.exit(cmd ? 1 : 0);
}
