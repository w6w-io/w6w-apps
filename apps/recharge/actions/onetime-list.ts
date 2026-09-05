import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams, timestampFilterParams, timestampFilterQuery } from "../lib/params.ts";

interface Input {
  addressId?: string;
  addressIds?: string;
  customerId?: string;
  externalVariantId?: string;
  includeCancelled?: boolean;
  ids?: string;
  limit?: number;
  cursor?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
}

/**
 * `GET /onetimes` — list one-time purchases. Scope: `read_subscriptions`
 * (Onetimes are administered under the same scope as Subscriptions, per the
 * reference).
 * Response envelope: `{"onetimes": [...], "next_cursor", "previous_cursor"}`.
 */
const onetimeList: ActionDefinition<Input> = {
  key: "onetime-list",
  type: "read",
  resource: "onetime",
  title: "List Onetimes",
  description: "Return a list of one-time purchases.",
  params: [
    { key: "addressId", label: "Address ID", type: "string" },
    { key: "addressIds", label: "Address IDs", type: "string", hint: "Comma-separated." },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "externalVariantId", label: "External variant ID", type: "string" },
    {
      key: "includeCancelled",
      label: "Include cancelled",
      type: "boolean",
      hint: "Also return cancelled onetimes alongside active ones.",
    },
    { key: "ids", label: "IDs", type: "string", hint: "Comma-separated onetime ids." },
    ...paginationParams(50),
    ...timestampFilterParams("Onetime"),
  ],
  output: [
    { key: "items", type: "array", label: "Onetimes" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/onetimes", "onetimes", {
      query: compact({
        address_id: input.addressId,
        address_ids: input.addressIds,
        customer_id: input.customerId,
        external_variant_id: input.externalVariantId,
        include_cancelled: input.includeCancelled,
        ids: input.ids,
        limit: input.limit,
        cursor: input.cursor,
        ...timestampFilterQuery(input),
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default onetimeList;
