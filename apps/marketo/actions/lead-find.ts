import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { FIELDS_PARAM } from "../lib/params.ts";

/**
 * `GET /rest/v1/leads.json?filterType&filterValues` — verified against
 * `leads.md` ("Get Leads by Filter Type"). `filterValues` accepts up to 300
 * comma-separated values; the call itself returns up to 300 records per
 * page. **There is no `nextPageToken` for this endpoint** — if more than
 * 1,000 leads in total match the filter, Marketo answers record-level error
 * 1003 "Too many results match the filter" instead of a page marker, so this
 * action does not attempt to page past that.
 *
 * `filterType` accepts most standard fields and any custom field of type
 * `string`, `email`, or `integer` — call `leads-describe` to see what is
 * available on this instance.
 */
const action: ActionDefinition = {
  key: "lead-find",
  type: "search",
  resource: "lead",
  title: "Find leads",
  description: "Find leads whose field matches one or more values (e.g. filter by email).",
  params: [
    {
      key: "filterType",
      label: "Filter Field",
      type: "string",
      required: true,
      default: "email",
      hint: "A standard field name (e.g. email, id) or a custom field's API name.",
    },
    {
      key: "filterValues",
      label: "Filter Values",
      type: "string",
      required: true,
      hint: "One or more values, comma-separated. Up to 300.",
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

    ctx.log("info", "finding Marketo leads", { filterType });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>("/leads.json", {
      query: {
        filterType,
        filterValues,
        fields: (p.fields as string) || undefined,
      },
    });
    return res.result ?? [];
  },
};

export default action;
