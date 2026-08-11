import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V2 } from "../lib/client.ts";

/**
 * `POST /rest/v2/automations/goals/achieve` — fire an API goal for a contact.
 *
 * The one endpoint that makes Keap automations reachable from outside: an
 * "API goal" placed in a campaign starts (or stops) whatever follows it, for
 * one contact.
 *
 * ## Two addressing schemes, and they are mutually exclusive
 *
 * Keap: "You must provide EITHER (`integration` + `call_name`) OR
 * (`automation_id` + `goal_id`), along with `contact_id`." Only `contact_id` is
 * in the schema's `required` list, so a request naming *neither* pair passes
 * schema validation and fails at runtime. The pairing is checked here instead.
 *
 * The `integration`/`call_name` pair is the one to prefer: those are the two
 * strings typed into the API-goal node in Keap's campaign builder, so they are
 * stable across a campaign being copied or republished, where the numeric
 * `automation_id`/`goal_id` are not.
 *
 * ## The ids are integers here, and strings everywhere else
 *
 * `contact_id`, `automation_id` and `goal_id` on this request are declared
 * `type: integer, format: int64`. Every other v2 endpoint in this app declares
 * the same identifiers as `type: string`. They are coerced to numbers here for
 * that reason.
 *
 * ## The response is a list of results, and `success` is per goal
 *
 * `{results: [{success, message, automation_id, goal_id, flow_start_results,
 * flow_stop_results}]}` — one entry per goal matched, because an
 * `integration`/`call_name` pair can appear in several campaigns at once. An
 * HTTP 200 with every entry `success: false` is a perfectly ordinary response.
 */
interface Input {
  contactId: string;
  integration?: string;
  callName?: string;
  automationId?: string;
  goalId?: string;
}

interface GoalResult {
  success?: boolean;
  message?: string;
  automation_id?: number;
  goal_id?: number;
}

const automationGoalAchieve: ActionDefinition<Input> = {
  key: "automation-goal-achieve",
  type: "perform",
  title: "Achieve Automation Goal",
  resource: "automation",
  description:
    "Fire an API goal for one contact, starting or stopping the campaign sequences behind it.",
  // Firing the same goal twice re-enters the contact into whatever follows it,
  // which for a sequence that sends mail means sending it again.
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "integration",
      label: "Integration name",
      type: "string",
      row: "callname",
      hint: "The integration name typed into the API goal in Keap's campaign builder. Use this " +
        "with the call name.",
    },
    { key: "callName", label: "Call name", type: "string", row: "callname" },
    {
      key: "automationId",
      label: "Automation ID",
      type: "string",
      advanced: true,
      row: "goalid",
      hint: "The alternative to the integration/call name pair. Less stable: these ids change " +
        "when a campaign is copied.",
    },
    { key: "goalId", label: "Goal ID", type: "string", advanced: true, row: "goalid" },
  ],
  output: [
    { key: "results", type: "array", label: "Per-goal results" },
    { key: "achieved", type: "number", label: "Goals reported successful" },
    { key: "failed", type: "number", label: "Goals reported unsuccessful" },
  ],

  async execute(input, ctx) {
    const byCallName = Boolean(input.integration) && Boolean(input.callName);
    const byId = Boolean(input.automationId) && Boolean(input.goalId);

    if (byCallName === byId) {
      throw new Error(
        byCallName
          ? "Supply either the integration and call name, or the automation and goal IDs — Keap " +
            "rejects both together."
          : "Supply either the integration and call name (both), or the automation and goal IDs " +
            "(both). Keap accepts no other combination.",
      );
    }

    const body = compact({
      // Integers on this endpoint alone — see the module doc.
      contact_id: Number(input.contactId),
      integration: byCallName ? input.integration : undefined,
      call_name: byCallName ? input.callName : undefined,
      automation_id: byId ? Number(input.automationId) : undefined,
      goal_id: byId ? Number(input.goalId) : undefined,
    });

    const client = new KeapClient(ctx);
    const response = await client.json<{ results?: GoalResult[] }>(
      `${V2}/automations/goals/achieve`,
      { method: "POST", body },
    );

    const results = response?.results ?? [];
    const achieved = results.filter((r) => r?.success === true).length;
    // A 200 whose every result is unsuccessful is a normal response, so the
    // counts are returned rather than the HTTP status being read as the answer.
    return { results, achieved, failed: results.length - achieved };
  },
};

export default automationGoalAchieve;
