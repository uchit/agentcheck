/**
 * The ten controls, mirrored from the published dataset at
 * https://hellouchit.com/dataset/dataset.json (CC BY 4.0).
 *
 * Bundled rather than fetched so the tool works offline, and so a network blip
 * or a change upstream cannot silently alter what you are being assessed
 * against between two runs of the same command.
 *
 * `wave` is the dependency layer: everything in wave 1 has no prerequisite
 * among these controls and can start immediately. `needs` names prerequisites
 * within the set — an edge means doing one without the other is technically
 * incoherent, not that one matters more.
 */

export const CONTROLS = [
  {
    id: "agent-identity",
    wave: 1,
    title: "Agent runs under its own workload identity",
    asks:
      "A distinct principal per agent, no human credentials in any agent execution path, and a revocation test showing tool calls fail within one polling interval.",
    check: {
      platform: "AWS",
      run: "aws sts get-caller-identity --query Arn --output text",
      expect:
        "An assumed-role ARN for the agent itself — not a human's, and not shared with other agents.",
    },
  },
  {
    id: "agent-autonomy-level",
    wave: 1,
    title: "Declared autonomy level per action class",
    asks:
      "A register of action classes with the autonomy level assigned to each and who approved it, plus per-run records of the level in force at execution time.",
  },
  {
    id: "agent-trajectory-trace",
    wave: 1,
    title: "Full replayable trajectory",
    asks:
      "One run exported end to end: assembled context, retrieved document IDs, every tool call with arguments and result, model and prompt version, tokens, cost, latency. The test is whether you can replay from step N.",
    check: {
      platform: "OpenTelemetry",
      run: null,
      expect:
        "A span per tool call. Zero means the trajectory is reconstructed from logs, not recorded.",
    },
  },
  {
    id: "agent-prompt-injection",
    wave: 1,
    title: "Retrieved and tool-returned content treated as untrusted",
    asks:
      "Red-team results for INDIRECT injection through each retrieval and tool-result path, not only direct user input, plus structural separation between instructions and data.",
  },
  {
    id: "agent-tool-authz",
    wave: 2,
    needs: ["agent-identity"],
    title: "Tool authorisation enforced outside the model",
    asks:
      "The tool manifest per role exported from config rather than described, and policy decision logs showing allow and deny with a reason per invocation.",
  },
  {
    id: "agent-human-oversight",
    wave: 2,
    needs: ["agent-autonomy-level"],
    title: "Named human approval for consequential actions",
    asks:
      "Approval records naming the individual, the proposed action, the reasoning shown to them, and the decision. Watch the approval rate — sustained near 100% means the gate is decorative.",
  },
  {
    id: "agent-blast-radius",
    wave: 2,
    needs: ["agent-identity"],
    title: "Bounded blast radius and a tested kill switch",
    asks:
      "Configured step, spend and rate ceilings, and a game-day record showing the kill switch stopping an agent MID-RUN with the time from decision to stop.",
    check: {
      platform: "Kubernetes",
      run: null,
      expect:
        "A quota on the agent's namespace. No quota means the ceiling is theoretical.",
    },
  },
  {
    id: "agent-action-reversibility",
    wave: 2,
    needs: ["agent-autonomy-level"],
    title: "Irreversible actions staged, gated or delayed",
    asks:
      "An inventory of agent-invokable actions classified reversible or not, with the mechanism named for each, and an approval gate or delay window on the rest.",
  },
  {
    id: "agent-multi-agent-provenance",
    wave: 2,
    needs: ["agent-trajectory-trace"],
    title: "Provenance across agents",
    asks:
      "For a given final output, the full upstream chain of agent runs that contributed to it, and a demonstration that a corrected upstream input marks the downstream outputs.",
  },
  {
    id: "agent-cost-per-outcome",
    wave: 2,
    needs: ["agent-trajectory-trace"],
    title: "Cost per resolved task, not per token",
    asks:
      "Cost per resolved task by agent and feature over time, alongside the cost of failed runs — the runs that fail and get retried are the ones that hurt.",
  },
];

export const STATUSES = ["met", "not-met", "not-applicable", "unknown"];

export const SOURCE = "https://hellouchit.com/agents/";
