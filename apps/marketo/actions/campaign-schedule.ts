import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { CAMPAIGN_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /rest/v1/campaigns/{id}/schedule.json` — verified against
 * `smart-campaigns.md` ("Schedule"). Schedules a **batch** campaign to run.
 * `runAt` defaults to five minutes from the request if omitted, and every
 * scheduled run waits a minimum of five minutes regardless — this action
 * does not attempt to make a run happen sooner than that.
 *
 * `cloneToProgram` (clones the parent program under a new name and schedules
 * the clone) is deliberately left out: Marketo caps it at 20 calls/day and
 * its own docs recommend the dedicated Clone Program endpoint instead, which
 * is out of scope for this app (see README).
 *
 * Not idempotent: each call schedules another run of the campaign.
 */
const action: ActionDefinition = {
  key: "campaign-schedule",
  type: "perform",
  resource: "campaign",
  title: "Schedule a batch campaign",
  description: "Schedule a batch smart campaign to run, optionally overriding its My Tokens.",
  idempotent: false,
  params: [
    CAMPAIGN_ID_PARAM,
    {
      key: "runAt",
      label: "Run At",
      type: "datetime",
      hint: "Defaults to five minutes from now if left blank. Cannot be more than two years " +
        "in the future.",
    },
    {
      key: "tokens",
      label: "Token Overrides (JSON)",
      type: "json",
      hint: 'Override "My Tokens" for this run only, e.g. {"{{my.message}}": "Updated message"}.',
    },
  ],
  output: [{ key: "id", type: "number", label: "Campaign ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const campaignId = Number(p.campaignId);
    if (!Number.isFinite(campaignId)) throw new Error("`campaignId` must be a number");

    let tokens: Array<{ name: string; value: string }> | undefined;
    if (p.tokens) {
      let map: Record<string, unknown>;
      try {
        map = typeof p.tokens === "string"
          ? JSON.parse(p.tokens)
          : p.tokens as Record<string, unknown>;
      } catch {
        throw new Error("`tokens` must be valid JSON");
      }
      tokens = Object.entries(map).map(([name, value]) => ({ name, value: String(value) }));
    }

    ctx.log("info", "scheduling a Marketo batch campaign", { campaignId });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(
      `/campaigns/${campaignId}/schedule.json`,
      {
        method: "POST",
        body: { input: { runAt: p.runAt || undefined, tokens } },
      },
    );
    return res.result?.[0] ?? null;
  },
};

export default action;
