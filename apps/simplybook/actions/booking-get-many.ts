import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  page?: number;
  onPage?: number;
  upcomingOnly?: boolean;
  status?: "confirmed" | "confirmed_pending" | "pending" | "canceled" | "";
  serviceIds?: number[];
  providerIds?: number[];
  clientId?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * `GET /admin/bookings` — list bookings, most-filterable action in this app.
 *
 * The documented response shape (`AdminReportBookingEntity[]`, a bare array)
 * does NOT match its own prose — the endpoint description says "result is
 * wrapped into paginated result" the same way `client-get-many` genuinely is
 * (`{data, metadata}`), but the OpenAPI `responses` schema for this endpoint
 * is a flat array with no wrapper. `page`/`on_page` are still real, accepted
 * query parameters; there is just no `metadata` object telling a caller how
 * many pages exist, so exhausting the list means paging until a page comes
 * back short.
 */
const bookingGetMany: ActionDefinition<Input, unknown[]> = {
  key: "booking-get-many",
  type: "read",
  resource: "booking",
  title: "List Bookings",
  description: "List and filter bookings (GET /admin/bookings).",
  params: [
    { key: "page", label: "Page", type: "number", advanced: true },
    { key: "onPage", label: "Items per page", type: "number", advanced: true },
    {
      key: "upcomingOnly",
      label: "Upcoming only",
      type: "boolean",
      default: false,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "confirmed", label: "Confirmed" },
        { value: "confirmed_pending", label: "Confirmed (pending payment)" },
        { value: "pending", label: "Pending approval" },
        { value: "canceled", label: "Canceled" },
      ],
    },
    { key: "date", label: "Date (YYYY-MM-DD)", type: "date", advanced: true },
    { key: "dateFrom", label: "Date from (YYYY-MM-DD)", type: "date", advanced: true },
    { key: "dateTo", label: "Date to (YYYY-MM-DD)", type: "date", advanced: true },
    { key: "clientId", label: "Client ID", type: "number", advanced: true },
    {
      key: "serviceIds",
      label: "Service IDs",
      type: "array",
      item: { type: "number" },
      advanced: true,
    },
    {
      key: "providerIds",
      label: "Provider IDs",
      type: "array",
      item: { type: "number" },
      advanced: true,
    },
    { key: "search", label: "Search (code or client data)", type: "string", advanced: true },
  ],
  output: [{ key: "", type: "array", label: "Bookings" }],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request<unknown[]>("/admin/bookings", {
      query: {
        page: input.page,
        on_page: input.onPage,
        "filter[upcoming_only]": input.upcomingOnly ? 1 : undefined,
        "filter[status]": input.status || undefined,
        "filter[date]": input.date,
        "filter[date_from]": input.dateFrom,
        "filter[date_to]": input.dateTo,
        "filter[client_id]": input.clientId,
        "filter[services]": input.serviceIds,
        "filter[providers]": input.providerIds,
        "filter[search]": input.search,
      },
    });
  },
};

export default bookingGetMany;
