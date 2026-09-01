import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { customFieldsParam, ownerIdParam, tagsParam } from "../lib/params.ts";

/**
 * `POST /v2/deals` — create a deal. `name` and `contactId` (the primary
 * contact) are the only two required fields.
 *
 * `value` is sent as a string. The vendor changed the wire type of this field
 * to carry decimals precisely — "If a deal value has no decimal part (1000.0),
 * it will be returned as integer (1000)... If a deal has a decimal part
 * (1000.50), it will be returned as a string" — and its own docs "encourage
 * you to use a string with two decimal places" on write, which sidesteps the
 * ambiguity entirely.
 */
interface Input {
  name: string;
  contactId: number;
  value?: string;
  currency?: string;
  ownerId?: number;
  hot?: boolean;
  stageId?: number;
  sourceId?: number;
  estimatedCloseDate?: string;
  customizedWinLikelihood?: number;
  tags?: string;
  customFields?: unknown;
  extraFields?: unknown;
}

const dealCreate: ActionDefinition<Input> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description: "Create a deal against a primary contact.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "contactId", label: "Primary contact ID", type: "number", required: true },
    {
      key: "value",
      label: "Value",
      type: "string",
      hint: 'Send as a string with two decimal places, e.g. "1000.50".',
    },
    {
      key: "currency",
      label: "Currency (ISO 4217)",
      type: "string",
      placeholder: "USD",
      hint: "Defaults to the account's default currency.",
    },
    ownerIdParam,
    { key: "hot", label: "Hot", type: "boolean" },
    {
      key: "stageId",
      label: "Stage ID",
      type: "number",
      hint: "Defaults to the first stage of the default pipeline.",
    },
    { key: "sourceId", label: "Source ID", type: "number" },
    { key: "estimatedCloseDate", label: "Estimated close date", type: "date" },
    {
      key: "customizedWinLikelihood",
      label: "Win likelihood (0-100)",
      type: "number",
      validation: { min: 0, max: 100 },
    },
    tagsParam,
    customFieldsParam,
    {
      key: "extraFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Merged into the request body, overriding the fields above. Covers lossReasonId, " +
        "unqualifiedReasonId, lastStageChangeAt, addedAt and anything else the form does not.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New deal ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const data = {
      ...compact({
        name: input.name,
        contact_id: input.contactId,
        value: input.value,
        currency: input.currency,
        owner_id: input.ownerId,
        hot: input.hot,
        stage_id: input.stageId,
        source_id: input.sourceId,
        estimated_close_date: input.estimatedCloseDate,
        customized_win_likelihood: input.customizedWinLikelihood,
      }),
      tags: toList(input.tags),
      custom_fields: asOptionalJson(input.customFields, "Custom fields"),
      ...(extra ?? {}),
    };
    return await new SellClient(ctx).create("/deals", data, "deal");
  },
};

export default dealCreate;
