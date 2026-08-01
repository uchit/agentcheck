# agentcheck

[![CI](https://github.com/uchit/agentcheck/actions/workflows/ci.yml/badge.svg)](https://github.com/uchit/agentcheck/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@uchit/agentcheck.svg)](https://www.npmjs.com/package/@uchit/agentcheck)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Produce an evidence pack for an agent deployment. Zero dependencies, Node 18+,
everything it executes is read-only.

> Published as `@uchit/agentcheck` — npm rejects the unscoped name as too
> similar to an unrelated existing package. The installed binary is still
> `agentcheck`.

```sh
npx @uchit/agentcheck init
# fill in agentcheck.config.json
npx @uchit/agentcheck check --md evidence.md
```

## What it refuses to do

Most agent-governance tooling produces a score out of ten and a green tick.
That number is worse than nothing, because almost every control here can only
be attested by a human, and a tool that quietly turns an attestation into a
measurement launders an opinion into evidence.

So `agentcheck` separates two things and never merges them:

| | meaning |
|---|---|
| **DECLARED** | a human asserted it and signed their name to the assertion |
| **VERIFIED** | a read-only command ran, and its output is attached |

Both counts are reported. **They are never added together.** A pack that is
2 verified and 8 declared says exactly that. A command that runs and *fails*
counts as neither — it shows as a failed check and the verified count does not
move. There is a test asserting the output object exposes no aggregate score
field, so this cannot regress quietly.

If you want a single number for a slide, this is the wrong tool. That is
deliberate.

## What makes a pack fail

`check` exits non-zero when the pack is not defensible:

- a control claimed **met** with no evidence recorded
- a control claimed **met** while one of its prerequisites is not met — the most
  common way one of these packs is quietly wrong. Tool authorisation cannot be
  met if the agent has no identity of its own to authorise.

An honest `unknown` does **not** fail. Unknown is the correct starting state,
and a tool that punishes it teaches people to guess.

That makes it usable as a CI gate:

```yaml
- run: npx @uchit/agentcheck check --config agentcheck.config.json --md evidence.md
```

## The ten controls

Wave 1 has no prerequisites and can start today. Wave 2 depends on wave 1.

**Wave 1** — own workload identity · declared autonomy level per action class ·
full replayable trajectory · retrieved and tool-returned content treated as
untrusted

**Wave 2** — tool authorisation enforced outside the model · named human
approval for consequential actions · bounded blast radius and a tested kill
switch · irreversible actions staged or delayed · provenance across agents ·
cost per resolved task

Full text, the evidence each produces, the read-only command that produces it,
and how each one fails: <https://hellouchit.com/agents/>

## Config

```json
{
  "agent": "support-triage",
  "environment": "production",
  "assessor": "you@example.com",
  "controls": {
    "agent-identity": {
      "status": "met",
      "evidence": "s3://audit/iam-export-2026-08.json",
      "note": ""
    }
  }
}
```

`status` is one of `met`, `not-met`, `not-applicable`, `unknown`. Anything
unrecognised is treated as `unknown` rather than silently accepted.
`evidence` should point at the artefact, not describe it.

## Options

| flag | effect |
|---|---|
| `--run` | execute the read-only checks. Off by default — nothing touches your infrastructure unless you ask |
| `--json pack.json` | write the machine-readable evidence pack |
| `--md report.md` | write a Markdown report with command output attached inline |
| `--config path` | use a config other than `agentcheck.config.json` |

## Use as a library

```js
import { assess, exitCodeFor } from "@uchit/agentcheck";
import { CONTROLS } from "@uchit/agentcheck/controls";

const pack = assess(config);            // runs nothing
const strict = assess(config, { runner }); // supply your own executor
```

## Tests

```sh
npm test    # node:test, no dependencies
```

19 tests covering each way this tool could quietly lie about a deployment:
failed commands not counting as verified, prerequisite gaps including when the
prerequisite is merely `unknown`, unrecognised statuses, and the absence of an
aggregate score. CI runs them on Node 18, 20, 22 and 24, plus end-to-end
assertions on the exit codes — the exit codes are the contract, so a CLI
regression cannot ship green.

## Licence

Tool: MIT. Control set: CC BY 4.0, from
<https://hellouchit.com/dataset/dataset.json> — attribution: Uchit Vyas,
hellouchit.com.

None of this is a compliance assessment. It is a way to start from something
concrete instead of a blank page.
