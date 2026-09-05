import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { CAMPAIGN_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /rest/v1/campaigns/{id}/trigger.json` — verified against
 * `smart-campaigns.md` ("Trigger" / "Request Campaign"). The campaign must
 * use a "Campaign is Requested" trigger with Web Service API as its source —
 * calling this against a campaign that doesn't is a no-op or an error
 * depending on the campaign's own configuration, not something this action
 * can detect ahead of time. Up to 100 lead IDs per call; despite living
 * under `/rest/v1` alongside the Lead Database endpoints, `id` here is the
 * smart campaign's asset id.
 *
 * Not idempotent: passing a lead through a trigger campaign's flow is the
 * entire point, and running it again runs the flow again.
 */
const action: ActionDefinition = {
  key: "campaign-trigger",
  type: "perform",
  resource: "campaign",
  title: "Request a trigger campaign",
  description: "Pass one or more leads through a trigger campaign's flow.",
  idempotent: false,
  params: [
    CAMPAIGN_ID_PARAM,
    {
      key: "leadIds",
      label: "Lead IDs",
      type: "string",
      required: true,
      hint: "One or more lead IDs, comma-separated. Up to 100.",
    },
    {
      key: "tokens",
      label: "Token Overrides (JSON)",
      type: "json",
      hint: 'Override "My Tokens" for this run, e.g. {"{{my.message}}": "Updated message"}. Up ' +
        "to 100.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Request ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const campaignId = Number(p.campaignId);
    if (!Number.isFinite(campaignId)) throw new Error("`campaignId` must be a number");
    const leads = String(p.leadIds ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n))
      .map((id) => ({ id }));
    if (leads.length === 0) throw new Error("`leadIds` must contain at least one numeric ID");

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

    ctx.log("info", "requesting a Marketo trigger campaign", { campaignId, leads: leads.length });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(
      `/campaigns/${campaignId}/trigger.json`,
      { method: "POST", body: { input: { leads, tokens } } },
    );
    return res.result?.[0] ?? null;
  },
};

export default action;
