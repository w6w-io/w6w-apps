import type { ActionDefinition } from "@w6w/types";
import { compact, MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam, idParam, sendingDeliveryMethodOptions } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  id: string;
  deliveryMethod?: string;
  emailAddress?: string;
  emailMessage?: string;
  deliverUbl?: boolean;
}

/**
 * `PATCH /:administration_id/sales_invoices/:id/send_invoice.json`.
 *
 * This is what actually assigns the invoice number and moves a `draft`
 * invoice to `open` (or straight past it, per the workflow's own rules) — a
 * sales invoice created via Create Sales Invoice sits unsent until this
 * runs. Leaving every field empty sends with the contact's and workflow's own
 * defaults (or, if this invoice was sent before, the settings used last time).
 *
 * Scheduling a future send (`sending_scheduled` + an `invoice_date`) is not
 * exposed — this action only covers the immediate-send path.
 */
const salesInvoiceSend: ActionDefinition<Input> = {
  key: "sales-invoice-send",
  type: "perform",
  resource: "sales_invoice",
  title: "Send Sales Invoice",
  description: "Send a sales invoice by email, Peppol, or mark it as sent manually.",
  // Not idempotent: retrying re-sends the invoice email to the customer, which
  // is a real, customer-visible duplicate side effect, not a benign no-op.
  idempotent: false,
  params: [
    administrationIdParam,
    idParam("Sales Invoice ID"),
    {
      key: "deliveryMethod",
      label: "Delivery method",
      type: "select",
      options: sendingDeliveryMethodOptions,
      hint: "Defaults to the contact's own delivery method preference.",
    },
    {
      key: "emailAddress",
      label: "Recipient email",
      type: "string",
      hint: "Only used when delivery method is Email. Overrides the contact's default address.",
    },
    {
      key: "emailMessage",
      label: "Email message",
      type: "text",
      advanced: true,
      hint:
        "Only used when delivery method is Email. Defaults to the workflow's invoice email text.",
    },
    {
      key: "deliverUbl",
      label: "Attach UBL file",
      type: "boolean",
      advanced: true,
      hint: "Only used when delivery method is Email. Defaults to the contact's UBL preference.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Sales invoice ID" },
    { key: "state", type: "string", label: "State" },
    { key: "sent_at", type: "string", label: "Sent at" },
  ],

  execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    const sending = compact({
      delivery_method: input.deliveryMethod,
      email_address: input.emailAddress,
      email_message: input.emailMessage,
      deliver_ubl: input.deliverUbl,
    });
    return new MoneybirdClient(ctx, administrationId).request(
      `/sales_invoices/${encodeURIComponent(input.id)}/send_invoice`,
      {
        method: "PATCH",
        body: Object.keys(sending).length > 0 ? { sales_invoice_sending: sending } : {},
      },
    );
  },
};

export default salesInvoiceSend;
