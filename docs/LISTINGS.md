# Where this is listed

A running record of where agentcheck has been submitted, what each venue
actually requires, and what is blocked. Kept in the repo rather than in someone's
head so the status is checkable rather than remembered.

Status as of 2 Aug 2026. All three routes were checked at the source.

| target | status |
|---|---|
| awesome-ai-agents-security | **PR open** — https://github.com/ProjectRecon/awesome-ai-agents-security/pull/86 |
| OWASP GenAI Security Project | **yours to send** — no self-serve path, needs Slack + initiative leads |
| CNCF landscape | **blocked** — hard 300-star minimum, currently 0 |

---

## The facts you'll be asked for

| | |
|---|---|
| Name | agentcheck |
| npm | `@uchit/agentcheck` — https://www.npmjs.com/package/@uchit/agentcheck |
| Source | https://github.com/uchit/agentcheck |
| Licence | MIT (tool) · CC BY 4.0 (control set) |
| Language | JavaScript / Node 18+, zero dependencies |
| CI | Node 18/20/22/24 green, 19 tests |
| Docs | https://hellouchit.com/agents/ |
| Author | Uchit Vyas |

**One-line description**

> Produces an audit evidence pack for an agent deployment, separating what a
> human declared from what a read-only command verified — and refusing to
> combine them into a score.

---

## 1. awesome-ai-agents-security — SUBMITTED

**PR:** https://github.com/ProjectRecon/awesome-ai-agents-security/pull/86
**Section:** Guardrails & Compliance

The PR discloses authorship and flags a genuine placement question rather than
glossing it: that section is described as *middleware to enforce policies on
inputs and outputs*, and agentcheck is an assessment tool that runs against a
deployment, not middleware in the request path. It offers to move the entry or
have a separate *Assessment & Evidence* section, maintainer's choice. Pretending
it was middleware to get it merged would have been the wrong trade.

Two other active AI-security lists are worth a look once this one lands —
https://github.com/TalEliyahu/Awesome-AI-Security and
https://github.com/scadastrangelove/awesome-ai-security-tools. I have not read
their contribution guidelines, so check the format first.

---

## 2. OWASP GenAI Security Project — YOURS TO SEND

**Checked at source.** There is no self-serve tool-listing path and no
submission form for external tools. The documented route is:

1. Join the project Slack, channel `#project-genai`
2. Find the relevant workstream on their roadmap
3. Raise your hand to the initiative leads, who explain what they actually need

That is a relationship, not a pull request, and it needs to be you — I cannot
join a Slack workspace on your behalf.

**Message to post once you are in the channel:**

> Hi — I have published an open-source CLI that produces an audit evidence pack
> for agent deployments, and I would like to find the right home for it in the
> project, or contribute the control mapping if that is more useful than the
> tool itself.
>
> agentcheck assesses ten controls for running agents in regulated
> environments. Four map directly onto the Top 10 for LLM Applications — LLM01
> for indirect injection through retrieval and tool-result paths, and LLM06 for
> tool authorisation enforced outside the model, bounded blast radius and action
> reversibility.
>
> Its design constraint is that it will not emit a score. Most agentic controls
> can only be attested by a human, so human attestations and command-verified
> results are counted separately and never summed. It exits non-zero only when a
> control is claimed without evidence or rests on an unmet prerequisite, which
> makes it usable as a CI gate.
>
> MIT, zero dependencies, Node 18+. The control set itself is published under
> CC BY 4.0 and I am happy to align its wording with OWASP terminology.
>
> npm: https://www.npmjs.com/package/@uchit/agentcheck
> Source: https://github.com/uchit/agentcheck
> Controls: https://hellouchit.com/agents/

Fallback if Slack stalls: the Contribute Q&A group at contribute.genai.owasp.org.

---

## 3. CNCF landscape — BLOCKED, DO NOT SEND YET

**Checked at source.** The landscape README states the bar plainly:

> Cloud native projects with **at least 300 GitHub stars** that clearly fit in
> an existing category are generally included.

agentcheck currently has 0. It also says they are *"unlikely to create a new
category"*, and the natural category here is Security & Compliance alongside
policy and supply-chain tooling rather than anything AI-specific.

Submitting now would be declined on a published, objective criterion. Revisit at
300 stars. Everything else needed is ready — an SVG logo is the one asset that
does not exist yet.

---

## Sequencing note

#1 is submitted and waiting on a maintainer. #2 is the one that needs you — it
is outreach, not a form, and the payoff is larger than a list entry because the
control mapping could land inside an OWASP asset rather than beside it. #3 has a
hard number on it; there is nothing to decide until the stars exist.

The honest read on all of this: one open PR is not yet a listing. It becomes
evidence when it merges.
