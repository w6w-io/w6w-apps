import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { productOutput } from "../lib/params.ts";

interface Input {
  productKey: string;
  notes?: string;
  cost?: number;
  price?: number;
  quantity?: number;
  taxName1?: string;
  taxRate1?: number;
}

/** `POST /api/v1/products` — verified against `ProductRequest`. No field is documented required. */
const productCreate: ActionDefinition<Input> = {
  key: "product-create",
  type: "perform",
  resource: "product",
  title: "Create Product",
  description: "Create a product or service that can be added to invoice/quote line items.",
  idempotent: false,
  params: [
    { key: "productKey", label: "Product key (SKU)", type: "string", required: true },
    { key: "notes", label: "Description", type: "text" },
    { key: "price", label: "Price", type: "number", row: "money" },
    { key: "cost", label: "Cost", type: "number", advanced: true, row: "money" },
    { key: "quantity", label: "Default quantity", type: "number", advanced: true },
    { key: "taxName1", label: "Tax name", type: "string", advanced: true, row: "tax" },
    { key: "taxRate1", label: "Tax rate", type: "number", advanced: true, row: "tax" },
  ],
  output: productOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/products", {
      method: "POST",
      body: {
        product_key: input.productKey,
        notes: unset(input.notes),
        cost: input.cost,
        price: input.price,
        quantity: input.quantity,
        tax_name1: unset(input.taxName1),
        tax_rate1: input.taxRate1,
      },
    });
  },
};

export default productCreate;
