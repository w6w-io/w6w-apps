import type { ActionDefinition } from "@w6w/types";
import { Bitrix24Client, compact, parseJson, toMultifield } from "../lib/client.ts";
import { EXTRA_FIELDS_PARAM } from "../lib/params.ts";

interface Input {
  title?: string;
  name?: string;
  lastName?: string;
  statusId?: string;
  sourceId?: string;
  sourceDescription?: string;
  opportunity?: number;
  currencyId?: string;
  companyTitle?: string;
  comments?: string;
  assignedById?: number;
  phone?: string;
  email?: string;
  extraFields?: string | Record<string, unknown>;
}

/**
 * `crm.lead.add` — verified against `api-reference/crm/leads/crm-lead-add.html`.
 * DEPRECATED by the vendor in favor of `crm.item.add`, but still fully
 * documented and functional; the classic per-entity method is used here for
 * its simpler, typed field shape (see `README.md`).
 *
 * Creates a new lead. `fields` accepts far more than is curated below (every
 * `ADDRESS_*`, `UTM_*` and `UF_CRM_*` custom field) — use `extraFields` for
 * anything not listed as its own param.
 */
const action: ActionDefinition<Input, { id: number }> = {
  key: "lead-add",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a new CRM lead.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", hint: 'Defaults to "Lead #{id}".' },
    { key: "name", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    {
      key: "statusId",
      label: "Status",
      type: "string",
      default: "NEW",
      hint: "Default stage ids: NEW, IN_PROCESS, PROCESSED, JUNK, CONVERTED. A portal may define " +
        'custom stages too — list them with `crm.status.list`, filter { ENTITY_ID: "STATUS" }.',
    },
    {
      key: "sourceId",
      label: "Source",
      type: "string",
      hint: "Default source ids: CALL, EMAIL, WEB, ADVERTISING, PARTNER, RECOMMENDATION, " +
        "TRADE_SHOW, WEBFORM, CALLBACK, RC_GENERATOR, STORE, OTHER.",
    },
    { key: "sourceDescription", label: "Source Description", type: "string", advanced: true },
    { key: "opportunity", label: "Amount", type: "number" },
    { key: "currencyId", label: "Currency", type: "string", advanced: true },
    { key: "companyTitle", label: "Company Name", type: "string", advanced: true },
    { key: "comments", label: "Comments", type: "text", advanced: true },
    { key: "assignedById", label: "Assigned To (User ID)", type: "number", advanced: true },
    { key: "phone", label: "Phone", type: "string" },
    { key: "email", label: "Email", type: "string" },
    EXTRA_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Lead ID" }],

  async execute(input, ctx) {
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
        SOURCE_DESCRIPTION: input.sourceDescription,
        OPPORTUNITY: input.opportunity,
        CURRENCY_ID: input.currencyId,
        COMPANY_TITLE: input.companyTitle,
        COMMENTS: input.comments,
        ASSIGNED_BY_ID: input.assignedById,
        PHONE: toMultifield(input.phone),
        EMAIL: toMultifield(input.email),
      }),
    };

    ctx.log("info", "creating Bitrix24 lead", { title: input.title });
    const id = await new Bitrix24Client(ctx).call<number>("crm.lead.add", { fields });
    return { id };
  },
};

export default action;
