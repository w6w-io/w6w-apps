import type { ActionDefinition } from "@w6w/types";
import { compact, MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam, idParam, manualPaymentActionOptions } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  id: string;
  paymentDate: string;
  price: string;
  priceBase?: string;
  financialAccountId?: string;
  financialMutationId?: string;
  transactionIdentifier?: string;
  manualPaymentAction?: string;
  ledgerAccountId?: string;
  invoiceId?: string;
}

/**
 * `POST /:administration_id/sales_invoices/:sales_invoice_id/payments.json`.
 *
 * The OpenAPI document marks the older `PATCH .../register_payment` endpoint
 * `deprecated: true` with `x-sunset: 2026-12-31`, explicitly pointing at this
 * one ("Create a payment") as its replacement — so this app only implements
 * the replacement.
 */
const salesInvoicePaymentCreate: ActionDefinition<Input> = {
  key: "sales-invoice-payment-create",
  type: "perform",
  resource: "sales_invoice",
  title: "Register Sales Invoice Payment",
  description: "Register a payment against a sales invoice.",
  // No request key for dedup; retrying registers a second payment.
  idempotent: false,
  params: [
    administrationIdParam,
    idParam("Sales Invoice ID"),
    { key: "paymentDate", label: "Payment date", type: "date", required: true },
    {
      key: "price",
      label: "Amount paid",
      type: "string",
      required: true,
      hint: "In the invoice's own currency.",
    },
    {
      key: "priceBase",
      label: "Amount paid (base currency)",
      type: "string",
      advanced: true,
      hint: "Required when the invoice uses a currency other than the administration's base one.",
    },
    {
      key: "financialAccountId",
      label: "Financial account ID",
      type: "string",
      advanced: true,
      hint: "Required for the private_payment and cash_payment actions.",
    },
    {
      key: "financialMutationId",
      label: "Financial mutation ID",
      type: "string",
      advanced: true,
      hint: "The bank transaction to link this payment to. Required for bank_transfer.",
    },
    {
      key: "transactionIdentifier",
      label: "Transaction identifier",
      type: "string",
      advanced: true,
      hint: "An external reference, e.g. a PSP transaction id.",
    },
    {
      key: "manualPaymentAction",
      label: "Manual payment action",
      type: "select",
      advanced: true,
      options: manualPaymentActionOptions,
    },
    {
      key: "ledgerAccountId",
      label: "Ledger account ID",
      type: "string",
      advanced: true,
      hint: "Required for the balance_settlement action.",
    },
    {
      key: "invoiceId",
      label: "Settle against document ID",
      type: "string",
      advanced: true,
      hint: "Required for the invoices_settlement action.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "price", type: "string", label: "Amount paid" },
    { key: "payment_date", type: "string", label: "Payment date" },
  ],

  execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    const payment = compact({
      payment_date: input.paymentDate,
      price: input.price,
      price_base: input.priceBase,
      financial_account_id: input.financialAccountId,
      financial_mutation_id: input.financialMutationId,
      transaction_identifier: input.transactionIdentifier,
      manual_payment_action: input.manualPaymentAction,
      ledger_account_id: input.ledgerAccountId,
      invoice_id: input.invoiceId,
    });
    return new MoneybirdClient(ctx, administrationId).request(
      `/sales_invoices/${encodeURIComponent(input.id)}/payments`,
      { method: "POST", body: { payment } },
    );
  },
};

export default salesInvoicePaymentCreate;
