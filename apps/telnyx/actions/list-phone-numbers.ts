import type { ActionDefinition } from "@w6w/types";
import { TelnyxClient } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  pageNumber?: number;
  status?: string;
  phoneNumber?: string;
}

/**
 * `GET /phone_numbers` — the numbers owned by this Telnyx account.
 *
 * Pagination and filtering use OpenAPI `deepObject` query style
 * (`page[size]`, `page[number]`, `filter[status]`, `filter[phone_number]`),
 * not flat params — `lib/client.ts` documents why the bracketed key can be
 * passed straight through.
 */
const listPhoneNumbers: ActionDefinition<Input> = {
  key: "list-phone-numbers",
  type: "search",
  resource: "number",
  title: "List Phone Numbers",
  description: "List the phone numbers on this Telnyx account.",
  params: [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 20,
      hint: "1–250.",
    },
    { key: "pageNumber", label: "Page number", type: "number", default: 1 },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Active", value: "active" },
        { label: "Purchase pending", value: "purchase-pending" },
        { label: "Purchase failed", value: "purchase-failed" },
        { label: "Port pending", value: "port-pending" },
        { label: "Port failed", value: "port-failed" },
        { label: "Port out pending", value: "port-out-pending" },
        { label: "Ported out", value: "ported-out" },
        { label: "Emergency only", value: "emergency-only" },
        { label: "Deleted", value: "deleted" },
      ],
      hint: "Filter by number status.",
    },
    {
      key: "phoneNumber",
      label: "Phone number filter",
      type: "string",
      hint: "Filter by phone number. Requires at least three digits.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Phone numbers" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TelnyxClient(ctx).request("/phone_numbers", {
      query: {
        "page[size]": input.pageSize,
        "page[number]": input.pageNumber,
        "filter[status]": input.status,
        "filter[phone_number]": input.phoneNumber,
      },
    });
  },
};

export default listPhoneNumbers;
