import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact, idRef } from "../lib/client.ts";
import { activityTypeOptions, fieldsParam, refParam } from "../lib/params.ts";

/**
 * `POST /activities.json` — required: `type`, `date` (verified in the
 * OpenAPI document's create schema).
 *
 * **`quantity`'s unit is the single sharpest footgun in this API.** Per the
 * field's own OpenAPI description: on API versions <= 4.0.3 it is HOURS; on
 * the latest version it is SECONDS. This app sends no `X-API-VERSION` header,
 * which means the ACCOUNT's own configured default decides — so the same
 * `quantity` value silently means two different durations depending on a
 * setting this app cannot see. `quantitySeconds` below is named for the
 * current default rather than left as an ambiguous "quantity", specifically
 * so a caller has to notice the unit rather than copy a number from an hours-
 * based spreadsheet straight into a seconds field. If entries come back
 * 3,600x too long or too short, the account is pinned to an old API version.
 */
interface Input {
  type: string;
  date: string;
  matterId?: number;
  quantitySeconds?: number;
  price?: number;
  note?: string;
  nonBillable?: boolean;
  fields?: string;
}

const activityCreate: ActionDefinition<Input> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description: "Create a time entry, expense entry, or hard/soft cost entry.",
  idempotent: false,
  params: [
    { key: "type", label: "Type", type: "select", options: activityTypeOptions, required: true },
    { key: "date", label: "Date", type: "date", required: true },
    refParam("matterId", "Matter ID"),
    {
      key: "quantitySeconds",
      label: "Quantity (seconds)",
      type: "number",
      hint: "TimeEntry duration in SECONDS on Clio's current API version — see this file's own " +
        "doc comment. For ExpenseEntry/SoftCostEntry this is the quantity being priced, not a " +
        "duration.",
    },
    {
      key: "price",
      label: "Price",
      type: "number",
      hint: "Hourly/flat rate for a TimeEntry, or the expense amount for the other types. Leave " +
        "empty on a TimeEntry to use the matter/user/activity-description rate.",
    },
    { key: "note", label: "Note", type: "text" },
    { key: "nonBillable", label: "Non-billable", type: "boolean" },
    fieldsParam("id,etag,type,date,quantity,price,total"),
  ],
  output: [{ key: "data", type: "object", label: "The created activity" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data("/activities.json", {
      method: "POST",
      query: { fields: input.fields },
      body: compact({
        type: input.type,
        date: input.date,
        matter: idRef(input.matterId),
        quantity: input.quantitySeconds,
        price: input.price,
        note: input.note,
        non_billable: input.nonBillable,
      }),
    });
  },
};

export default activityCreate;
