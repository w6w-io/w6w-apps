import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { FIELDS_PARAM } from "../lib/params.ts";

/**
 * `GET /rest/v1/companies.json?filterType&filterValues` — verified against
 * `companies.md` ("Query"). `filterType` accepts only the fields listed in
 * Describe Companies' `searchableFields`/`dedupeFields` — commonly `id` and
 * `externalCompanyId`, not arbitrary company fields.
 */
const action: ActionDefinition = {
  key: "company-get",
  type: "search",
  resource: "company",
  title: "Find companies",
  description: "Find companies whose field matches one or more values.",
  params: [
    {
      key: "filterType",
      label: "Filter Field",
      type: "string",
      required: true,
      default: "externalCompanyId",
      hint: "A field from Describe Companies' searchableFields or dedupeFields (commonly id or " +
        "externalCompanyId).",
    },
    {
      key: "filterValues",
      label: "Filter Values",
      type: "string",
      required: true,
      hint: "One or more values, comma-separated.",
    },
    FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const filterType = String(p.filterType ?? "").trim();
    const filterValues = String(p.filterValues ?? "").trim();
    if (!filterType) throw new Error("`filterType` is required");
    if (!filterValues) throw new Error("`filterValues` is required");

    ctx.log("info", "finding Marketo companies", { filterType });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>("/companies.json", {
      query: { filterType, filterValues, fields: (p.fields as string) || undefined },
    });
    return res.result ?? [];
  },
};

export default action;
