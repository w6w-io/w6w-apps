import type { ActionDefinition } from "@w6w/types";
import { compact, INVOICE_FIELDS, jsonArrayArg, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  customerId: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  items?: unknown;
  status?: "DRAFT" | "SAVED";
  title?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  memo?: string;
}

const MUTATION = `
  mutation CreateInvoice($input: InvoiceCreateInput!) {
    invoiceCreate(input: $input) {
      didSucceed
      inputErrors { code message path }
      invoice { ${INVOICE_FIELDS} }
    }
  }
`;

const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    "Create an invoice for a customer. Give a single product line via `Product ID`/`Quantity`, or a full line-item array via `Items` for multi-line invoices.",
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
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "DRAFT", label: "Draft" }, { value: "SAVED", label: "Saved" }],
      default: "SAVED",
    },
    { key: "title", label: "Title", type: "string", advanced: true },
    { key: "invoiceNumber", label: "Invoice number", type: "string", advanced: true },
    { key: "invoiceDate", label: "Invoice date", type: "date", advanced: true },
    { key: "dueDate", label: "Due date", type: "date", advanced: true },
    { key: "memo", label: "Memo", type: "text", advanced: true },
  ],
  output: [{ key: "invoice", type: "object", label: "The created invoice" }],

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
        status: input.status,
        title: input.title,
        invoiceNumber: input.invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        memo: input.memo,
      }),
    });

    return unwrap(data, "invoiceCreate");
  },
};

export default invoiceCreate;
