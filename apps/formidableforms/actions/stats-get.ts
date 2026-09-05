import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  type: string;
  fieldId: string;
}

/**
 * `GET /frm/v3/stats/{type}/{field_id}` — a computed statistic over one or
 * more fields. Requires "View Entries from Admin Area".
 *
 * The v3 reference names the shape (`Statistic type and one field ID, field
 * key, or comma-separated list`) without re-enumerating the statistic type
 * names — those come from the frozen `/frm/v2/stats/{type}/{field_id}` routes
 * documented in the vendor's older Form Webhooks API article: `total`,
 * `count`, `average`, `median`, `star`, `maximum`, `minimum`, `unique`,
 * `deviation`. This action offers them as the type value, on the
 * understanding that they describe the same statistics concept the v3 route
 * carries forward — the v3 page does not independently confirm the list is
 * unchanged, so treat an unrecognised type response as a signal to check the
 * site's own current documentation.
 */
const statsGet: ActionDefinition<Input> = {
  key: "stats-get",
  type: "read",
  resource: "stats",
  title: "Get Field Statistic",
  description: "Compute a statistic (total, average, etc.) over one or more fields.",
  params: [
    {
      key: "type",
      label: "Statistic Type",
      type: "select",
      required: true,
      options: [
        { value: "total", label: "Total" },
        { value: "count", label: "Count" },
        { value: "average", label: "Average" },
        { value: "median", label: "Median" },
        { value: "star", label: "Star" },
        { value: "maximum", label: "Maximum" },
        { value: "minimum", label: "Minimum" },
        { value: "unique", label: "Unique" },
        { value: "deviation", label: "Deviation" },
      ],
    },
    {
      key: "fieldId",
      label: "Field ID(s) or Key(s)",
      type: "string",
      required: true,
      hint: "A single field ID/key, or a comma-separated list.",
    },
  ],

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    return client.request(
      `/stats/${encodeURIComponent(input.type)}/${encodeURIComponent(input.fieldId)}`,
    );
  },
};

export default statsGet;
