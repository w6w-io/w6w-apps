import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { FIELDS_PARAM, LEAD_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /rest/v1/lead/{id}.json` — verified against `leads.md` ("Get Lead by
 * Id"). Always returns exactly one record in the first position of `result`.
 * Omitting `fields` returns Marketo's documented default set: `id`, `email`,
 * `updatedAt`, `createdAt`, `firstName`, `lastName`.
 */
const action: ActionDefinition = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get a lead",
  description: "Get a single lead by its Marketo ID.",
  params: [LEAD_ID_PARAM, FIELDS_PARAM],
  output: [{ key: "id", type: "number", label: "ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.leadId);
    if (!Number.isFinite(id)) throw new Error("`leadId` must be a number");

    ctx.log("info", "getting a Marketo lead", { id });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>(`/lead/${id}.json`, {
      query: { fields: (p.fields as string) || undefined },
    });
    return res.result?.[0] ?? null;
  },
};

export default action;
