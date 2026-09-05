import type { ActionDefinition } from "@w6w/types";
import { compactBody, deriveUuid, WiseClient } from "../lib/client.ts";

/**
 * `POST /transfers` — create a transfer from a quote and a recipient account.
 *
 * ## `customerTransactionId` is a REQUIRED, strictly-formatted idempotency key
 *
 * Wise's schema requires it (`"required": ["targetAccount", "quoteUuid",
 * "customerTransactionId"]`) and documents its format as `"uuid"` — described
 * as "Required to perform idempotency check to avoid duplicate transfers in
 * case of network failures or timeouts." Unlike Apify's webhook idempotency
 * key ("a UUID or another random string with enough entropy"), this one is
 * strict, so `ctx.invocation.invocationId` (shaped `inv_01HXY...` per
 * `rfcs/invocation.md`, not a UUID) cannot be sent as-is. When the caller
 * doesn't supply one, this action derives a stable UUID from the invocation ID
 * via {@link deriveUuid} — the same invocation always derives the same key, so
 * a retried step reuses it instead of double-sending a payment.
 *
 * ## One quote, one transfer
 *
 * "You can only create one transfer per one quote" per the vendor — a second
 * `transfer-create` against the same `quoteUuid` is refused, not deduplicated,
 * so retries must go through `customerTransactionId`, not by reusing a quote.
 */
interface Input {
  targetAccount: number;
  quoteUuid: string;
  customerTransactionId?: string;
  sourceAccount?: number;
  reference?: string;
  transferPurpose?: string;
  transferPurposeSubTransferPurpose?: string;
  transferPurposeInvoiceNumber?: string;
  sourceOfFunds?: string;
}

const transferCreate: ActionDefinition<Input> = {
  key: "transfer-create",
  type: "perform",
  resource: "transfer",
  title: "Create Transfer",
  description: "Create a transfer from a quote and a recipient account.",
  // Safe to retry: the idempotency key above makes a repeated call with the
  // same invocation a no-op on Wise's side rather than a duplicate payment.
  idempotent: true,
  params: [
    {
      key: "targetAccount",
      label: "Recipient account ID",
      type: "number",
      required: true,
      hint: "From Create Recipient.",
    },
    {
      key: "quoteUuid",
      label: "Quote ID",
      type: "string",
      required: true,
      hint: "From Create Quote. You can only create one transfer per quote.",
    },
    {
      key: "customerTransactionId",
      label: "Idempotency key",
      type: "string",
      hint:
        "UUID. Leave empty to derive one automatically from this step's invocation, so a retry " +
        "of the same step reuses it instead of creating a duplicate transfer.",
    },
    {
      key: "sourceAccount",
      label: "Refund recipient account ID",
      type: "number",
      hint: "Optional. Where a refund would be sent if this transfer fails.",
    },
    {
      key: "reference",
      label: "Reference",
      type: "string",
      hint: "Text the recipient sees on their bank statement.",
    },
    {
      key: "transferPurpose",
      label: "Transfer purpose",
      type: "string",
      advanced: true,
      hint: "Conditionally required for some currencies (e.g. THB). See Transfer Requirements.",
    },
    {
      key: "transferPurposeSubTransferPurpose",
      label: "Transfer purpose (sub)",
      type: "string",
      advanced: true,
      hint: "Conditionally required for some currencies (e.g. CNY).",
    },
    {
      key: "transferPurposeInvoiceNumber",
      label: "Invoice number",
      type: "string",
      advanced: true,
      hint: "Conditionally required for some currencies (e.g. INR).",
    },
    {
      key: "sourceOfFunds",
      label: "Source of funds",
      type: "string",
      advanced: true,
      hint: "Conditionally required for large USD transfers (over 80k).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Transfer ID" },
    { key: "status", type: "string", label: "Transfer status" },
    { key: "quoteUuid", type: "string", label: "Quote used" },
  ],

  async execute(input, ctx) {
    const customerTransactionId = input.customerTransactionId ??
      (ctx.invocation?.invocationId
        ? await deriveUuid(ctx.invocation.invocationId)
        : crypto.randomUUID());

    const details = compactBody({
      reference: input.reference,
      transferPurpose: input.transferPurpose,
      transferPurposeSubTransferPurpose: input.transferPurposeSubTransferPurpose,
      transferPurposeInvoiceNumber: input.transferPurposeInvoiceNumber,
      sourceOfFunds: input.sourceOfFunds,
    });

    ctx.log("info", "creating Wise transfer", { targetAccount: input.targetAccount });
    return new WiseClient(ctx).json("/transfers", {
      method: "POST",
      body: compactBody({
        targetAccount: input.targetAccount,
        quoteUuid: input.quoteUuid,
        customerTransactionId,
        sourceAccount: input.sourceAccount,
        details: Object.keys(details).length > 0 ? details : undefined,
      }),
    });
  },
};

export default transferCreate;
