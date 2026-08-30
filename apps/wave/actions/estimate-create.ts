import type { ActionDefinition } from "@w6w/types";
import { compact, ESTIMATE_FIELDS, jsonArrayArg, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  customerId: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  items?: unknown;
  title?: string;
  estimateNumber?: string;
  estimateDate?: string;
  dueDate?: string;
  memo?: string;
}

/**
 * `EstimateCreateStatus` has exactly one member, `DRAFT` — every estimate is
 * created as a draft, so `status` is not exposed as a param.
 */
const MUTATION = `
  mutation CreateEstimate($input: EstimateCreateInput!) {
    estimateCreate(input: $input) {
      didSucceed
      inputErrors { code message path }
      estimate { ${ESTIMATE_FIELDS} }
    }
  }
`;

const estimateCreate: ActionDefinition<Input> = {
  key: "estimate-create",
  type: "perform",
  resource: "estimate",
  title: "Create Estimate",
  description:
    "Create an estimate for a customer. Give a single product line via `Product ID`/`Quantity`, or a full line-item array via `Items` for multi-line estimates.",
  idempotent: false,
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      hint: "Single-item convenience — ignored if `Items` is set.",
      row: "item",
    },
    { key: "quantity", label: "Quantity", type: "number", default: 1, row: "item" },
    {
      key: "unitPrice",
      label: "Unit price override",
      type: "number",
      hint: "Leave unset to use the product's own price.",
      row: "item",
      advanced: true,
    },
    {
      key: "items",
      label: "Items (JSON)",
      type: "json",
      hint:
        "Overrides the single-item fields above. Array of `{ productId, description?, quantity?, unitPrice? }`.",
      advanced: true,
    },
    { key: "title", label: "Title", type: "string", advanced: true },
    { key: "estimateNumber", label: "Estimate number", type: "string", advanced: true },
    { key: "estimateDate", label: "Estimate date", type: "date", advanced: true },
    { key: "dueDate", label: "Due date", type: "date", advanced: true },
    { key: "memo", label: "Memo", type: "text", advanced: true },
  ],
  output: [{ key: "estimate", type: "object", label: "The created estimate" }],

  async execute(input, ctx) {
    const parsedItems = jsonArrayArg(input.items, "items");
    const items = parsedItems ? parsedItems : input.productId
      ? [
        compact({
          productId: input.productId,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
        }),
      ]
      : undefined;

    const data = await new WaveClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        businessId: input.businessId,
        customerId: input.customerId,
        items,
        title: input.title,
        estimateNumber: input.estimateNumber,
        estimateDate: input.estimateDate,
        dueDate: input.dueDate,
        memo: input.memo,
      }),
    });

    return unwrap(data, "estimateCreate");
  },
};

export default estimateCreate;
