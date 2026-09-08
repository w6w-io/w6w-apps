import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client, compact, parseJson, toMultifield } from "../lib/client.ts";
import { EXTRA_FIELDS_PARAM, idParam } from "../lib/params.ts";

interface Input {
  id: number;
  title?: string;
  name?: string;
  lastName?: string;
  statusId?: string;
  sourceId?: string;
  opportunity?: number;
  currencyId?: string;
  comments?: string;
  assignedById?: number;
  phone?: string;
  email?: string;
  extraFields?: string | Record<string, unknown>;
}

/**
 * `crm.lead.update` — verified against `api-reference/crm/leads/crm-lead-update.html`.
 * DEPRECATED by the vendor in favor of `crm.item.update` (see `README.md`).
 *
 * Only the fields provided are changed. Retrying with the same input is
 * safe — it sets the same absolute values again.
 */
const action: ActionDefinition<Input, { id: number; updated: boolean }> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update an existing lead's fields.",
  idempotent: true,
  params: [
    idParam("Lead"),
    { key: "title", label: "Title", type: "string" },
    { key: "name", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "statusId", label: "Status", type: "string" },
    { key: "sourceId", label: "Source", type: "string" },
    { key: "opportunity", label: "Amount", type: "number" },
    { key: "currencyId", label: "Currency", type: "string", advanced: true },
    { key: "comments", label: "Comments", type: "text", advanced: true },
    { key: "assignedById", label: "Assigned To (User ID)", type: "number", advanced: true },
    { key: "phone", label: "Phone", type: "string" },
    { key: "email", label: "Email", type: "string" },
    EXTRA_FIELDS_PARAM,
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "updated", type: "boolean", label: "Updated" },
  ],

  async execute(input, ctx) {
    const id = Number(input.id);
    if (!Number.isFinite(id)) throw new Error("`id` must be a number");

    const extra = parseJson(input.extraFields, "extraFields") as
      | Record<string, unknown>
      | undefined;
    if (extra !== undefined && (typeof extra !== "object" || Array.isArray(extra))) {
      throw new Error("`extraFields` must be a JSON object");
    }

    const fields = {
      ...(extra ?? {}),
      ...compact({
        TITLE: input.title,
        NAME: input.name,
        LAST_NAME: input.lastName,
        STATUS_ID: input.statusId,
        SOURCE_ID: input.sourceId,
        OPPORTUNITY: input.opportunity,
        CURRENCY_ID: input.currencyId,
        COMMENTS: input.comments,
        ASSIGNED_BY_ID: input.assignedById,
        PHONE: toMultifield(input.phone),
        EMAIL: toMultifield(input.email),
      }),
    };
    if (Object.keys(fields).length === 0) {
      throw new Error("update requires at least one field to change");
    }

    ctx.log("info", "updating Bitrix24 lead", { id });
    const updated = await new Bitrix24Client(ctx).call<boolean>("crm.lead.update", { id, fields });
    return { id, updated };
  },
};

export default action;
