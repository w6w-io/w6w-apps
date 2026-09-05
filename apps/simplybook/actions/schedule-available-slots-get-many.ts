import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  serviceId: number;
  providerId: number;
  date: string;
  count?: number;
  productIds?: number[];
}

/**
 * `GET /admin/schedule/available-slots` — bookable time slots for a
 * service/provider pair on a given date. All four of `service_id`,
 * `provider_id`, `date` and `count` are documented `required` query
 * parameters, unlike every other list endpoint in this API — `count`
 * defaults to `1` here since a single-slot check is the common case, not
 * because the vendor treats it as optional.
 */
const scheduleAvailableSlotsGetMany: ActionDefinition<Input, unknown[]> = {
  key: "schedule-available-slots-get-many",
  type: "read",
  resource: "schedule",
  title: "Check Available Slots",
  description: "List available booking slots for a service/provider on a date " +
    "(GET /admin/schedule/available-slots).",
  params: [
    { key: "serviceId", label: "Service ID", type: "number", required: true, row: "who" },
    { key: "providerId", label: "Provider ID", type: "number", required: true, row: "who" },
    { key: "date", label: "Date (YYYY-MM-DD)", type: "date", required: true },
    {
      key: "count",
      label: "Group booking count",
      type: "number",
      default: 1,
      hint: "How many simultaneous bookings the slot must accommodate.",
    },
    {
      key: "productIds",
      label: "Product/add-on IDs",
      type: "array",
      item: { type: "number" },
      advanced: true,
    },
  ],
  output: [{ key: "", type: "array", label: "Available slots" }],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request<unknown[]>("/admin/schedule/available-slots", {
      query: {
        service_id: input.serviceId,
        provider_id: input.providerId,
        date: input.date,
        count: input.count ?? 1,
        products: input.productIds,
      },
    });
  },
};

export default scheduleAvailableSlotsGetMany;
