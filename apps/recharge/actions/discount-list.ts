import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  discountCode?: string;
  valueType?: string;
  status?: string;
  ids?: string;
  limit?: number;
  cursor?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
}

/**
 * `GET /discounts` — list discounts. Scope: `read_discounts` (per the
 * reference's own Authentication scope catalog, which lists `read_discounts`
 * even though this endpoint's own section omits a `Scopes:` line).
 * Response envelope: `{"discounts": [...], "next_cursor", "previous_cursor"}`.
 */
const discountList: ActionDefinition<Input> = {
  key: "discount-list",
  type: "read",
  resource: "discount",
  title: "List Discounts",
  description: "Return a list of discounts in your Recharge store.",
  params: [
    { key: "discountCode", label: "Discount code", type: "string" },
    {
      key: "valueType",
      label: "Value type",
      type: "select",
      options: [
        { value: "percentage", label: "Percentage" },
        { value: "fixed_amount", label: "Fixed amount" },
        { value: "shipping", label: "Shipping" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "enabled", label: "Enabled" },
        { value: "disabled", label: "Disabled" },
        { value: "fully_disabled", label: "Fully disabled" },
      ],
    },
    { key: "ids", label: "IDs", type: "string", hint: "Comma-separated discount ids." },
    ...paginationParams(50),
    {
      key: "createdAtMin",
      label: "Created after",
      type: "datetime",
    },
    { key: "createdAtMax", label: "Created before", type: "datetime" },
    { key: "updatedAtMin", label: "Updated after", type: "datetime" },
    { key: "updatedAtMax", label: "Updated before", type: "datetime" },
  ],
  output: [
    { key: "items", type: "array", label: "Discounts" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "previousCursor", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    const page = await client.list("/discounts", "discounts", {
      query: compact({
        discount_code: input.discountCode,
        value_type: input.valueType,
        status: input.status,
        ids: input.ids,
        limit: input.limit,
        cursor: input.cursor,
        created_at_min: input.createdAtMin,
        created_at_max: input.createdAtMax,
        updated_at_min: input.updatedAtMin,
        updated_at_max: input.updatedAtMax,
      }),
    });
    return { items: page.items, nextCursor: page.nextCursor, previousCursor: page.previousCursor };
  },
};

export default discountList;
