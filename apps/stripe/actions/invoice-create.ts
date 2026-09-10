import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  collectionMethod?: string;
  daysUntilDue?: number;
  dueDate?: number;
  description?: string;
  autoAdvance?: boolean;
  metadata?: unknown;
}

/**
 * Creates a DRAFT invoice. It sweeps up the customer's pending invoice items;
 * nothing is billed until it is finalised (`invoice-finalize`) or Stripe's
 * auto-advance dunning takes over.
 */
const invoiceCreate: ActionDefinition<Input> = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice",
  description:
    "Create a draft invoice from the customer's pending invoice items. Nothing is billed until it is finalised.",
  idempotent: true,
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      placeholder: "cus_…",
    },
    {
      key: "collectionMethod",
      label: "Collection",
      type: "select",
      default: "charge_automatically",
      options: [
        { value: "charge_automatically", label: "Charge automatically" },
        { value: "send_invoice", label: "Send invoice (customer pays manually)" },
      ],
    },
    {
      key: "daysUntilDue",
      label: "Days until due",
      type: "number",
      showIf: { field: "collectionMethod", eq: "send_invoice" },
      validation: { min: 0, integer: true },
      hint: "Required when the collection method is Send invoice.",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "number",
      showIf: { field: "collectionMethod", eq: "send_invoice" },
      hint: "Unix timestamp. Mutually exclusive with Days until due.",
    },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "autoAdvance",
      label: "Auto-advance",
      type: "boolean",
      hint: "Let Stripe finalise and attempt collection on its own schedule.",
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "total", type: "number", label: "Total" },
    { key: "hosted_invoice_url", type: "string", label: "Hosted invoice URL" },
  ],

  execute(input, ctx) {
    return new StripeClient(ctx).request("/invoices", {
      form: {
        customer: input.customerId,
        collection_method: unset(input.collectionMethod),
        days_until_due: input.daysUntilDue,
        due_date: input.dueDate,
        description: unset(input.description),
        auto_advance: input.autoAdvance,
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default invoiceCreate;
