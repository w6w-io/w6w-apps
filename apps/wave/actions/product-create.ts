import type { ActionDefinition } from "@w6w/types";
import { compact, PRODUCT_FIELDS, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  name: string;
  unitPrice: number;
  description?: string;
  incomeAccountId?: string;
  expenseAccountId?: string;
}

/**
 * Wave's own doc ("Mutation: Create product/service"): provide
 * `incomeAccountId` to mark the product as sold, `expenseAccountId` to mark
 * it as bought, either or both. Valid income accounts have subtype `INCOME`,
 * `DISCOUNTS` or `OTHER_INCOME`; valid expense accounts have subtype
 * `EXPENSE`, `COST_OF_GOODS_SOLD`, `PAYMENT_PROCESSING_FEES` or
 * `PAYROLL_EXPENSES` — `account-list` (filtered by `subtypes`) finds them.
 */
const MUTATION = `
  mutation CreateProduct($input: ProductCreateInput!) {
    productCreate(input: $input) {
      didSucceed
      inputErrors { code message path }
      product { ${PRODUCT_FIELDS} }
    }
  }
`;

const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description:
    "Create a product or service. Provide an income account to sell it, an expense account to buy it, or both.",
  idempotent: false,
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "unitPrice", label: "Unit price", type: "number", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "incomeAccountId",
      label: "Income account ID",
      type: "string",
      hint:
        "Marks the product as sold. Find one with account-list filtered to subtypes INCOME/DISCOUNTS/OTHER_INCOME.",
    },
    {
      key: "expenseAccountId",
      label: "Expense account ID",
      type: "string",
      hint:
        "Marks the product as bought. Find one with account-list filtered to subtypes EXPENSE/COST_OF_GOODS_SOLD/PAYMENT_PROCESSING_FEES/PAYROLL_EXPENSES.",
      advanced: true,
    },
  ],
  output: [{ key: "product", type: "object", label: "The created product" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        businessId: input.businessId,
        name: input.name,
        unitPrice: input.unitPrice,
        description: input.description,
        incomeAccountId: input.incomeAccountId,
        expenseAccountId: input.expenseAccountId,
      }),
    });

    return unwrap(data, "productCreate");
  },
};

export default productCreate;
