import type { ActionDefinition } from "@w6w/types";
import { ClioClient, compact } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/**
 * `PATCH /activities/{id}.json`. See `activity-create.ts` for the
 * hours-vs-seconds `quantity` unit gotcha, which applies identically here.
 */
interface Input {
  id: number;
  quantitySeconds?: number;
  price?: number;
  note?: string;
  nonBillable?: boolean;
  fields?: string;
}

const activityUpdate: ActionDefinition<Input> = {
  key: "activity-update",
  type: "perform",
  resource: "activity",
  title: "Update Activity",
  description: "Update fields on an existing time/expense/cost entry. Only the fields you set " +
    "are changed.",
  idempotent: true,
  params: [
    idParam("Activity ID"),
    {
      key: "quantitySeconds",
      label: "Quantity (seconds)",
      type: "number",
      hint: "See activity-create for why this is seconds, not hours, on Clio's current API " +
        "version.",
    },
    {
      key: "price",
      label: "Price",
      type: "number",
      hint: "Leaving this empty while changing matter/user/activity-description resets the " +
        "price from the applicable rate — Clio's own documented behaviour.",
    },
    { key: "note", label: "Note", type: "text" },
    { key: "nonBillable", label: "Non-billable", type: "boolean" },
    fieldsParam("id,etag,type,date,quantity,price,total"),
  ],
  output: [{ key: "data", type: "object", label: "The updated activity" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/activities/${input.id}.json`, {
      method: "PATCH",
      query: { fields: input.fields },
      body: compact({
        quantity: input.quantitySeconds,
        price: input.price,
        note: input.note,
        non_billable: input.nonBillable,
      }),
    });
  },
};

export default activityUpdate;
