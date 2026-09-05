import type { ActionDefinition } from "@w6w/types";
import { compact, ZuoraClient } from "../lib/client.ts";

interface Input {
  name: string;
  currency: string;
  billToFirstName: string;
  billToLastName: string;
  billToWorkEmail?: string;
  billToCountry?: string;
  accountNumber?: string;
  crmId?: string;
  batch?: string;
  autoPay?: boolean;
  notes?: string;
  paymentTerm?: string;
  billCycleDay?: number;
}

/**
 * `POST /v1/accounts` — verified against
 * `developer.zuora.com/v1-api-reference/api/accounts/post_account`.
 *
 * Required by Zuora: `name`, `currency`, and `billToContact` with at least
 * `firstName` + `lastName`. This app flattens the bill-to contact to its
 * required fields plus the two most commonly set optional ones (work email,
 * country) rather than exposing all ~15 contact fields or the credit card /
 * payment method fields — the full create schema also accepts an inline
 * `subscription` object and can run billing + collect payment in the same
 * atomic call, which Zuora's own docs say to prefer "Create an order" for
 * instead (see `order-create.ts`); this action stays scoped to "create a
 * billing account" and nothing else.
 *
 * Sets `Idempotency-Key` from the invocation id — safe here because this is a
 * POST. See `lib/client.ts`'s module doc for why the same header is NOT set on
 * `account-update` (a PUT), which Zuora's own docs say the header does not
 * apply to.
 */
const action: ActionDefinition<Input> = {
  key: "account-create",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: "Create a customer account with a bill-to contact.",
  idempotent: true,
  params: [
    { key: "name", label: "Account Name", type: "string", required: true, row: "name" },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      row: "name",
      placeholder: "USD",
    },
    {
      key: "billToFirstName",
      label: "Bill-To First Name",
      type: "string",
      required: true,
      row: "billto",
    },
    {
      key: "billToLastName",
      label: "Bill-To Last Name",
      type: "string",
      required: true,
      row: "billto",
    },
    { key: "billToWorkEmail", label: "Bill-To Work Email", type: "string", row: "billto2" },
    { key: "billToCountry", label: "Bill-To Country", type: "string", row: "billto2" },
    { key: "accountNumber", label: "Account Number", type: "string", advanced: true },
    { key: "crmId", label: "CRM ID", type: "string", advanced: true },
    { key: "batch", label: "Batch", type: "string", advanced: true },
    { key: "autoPay", label: "Auto Pay", type: "boolean", advanced: true },
    { key: "paymentTerm", label: "Payment Term", type: "string", advanced: true },
    { key: "billCycleDay", label: "Bill Cycle Day", type: "number", advanced: true },
    { key: "notes", label: "Notes", type: "text", advanced: true },
  ],
  output: [{ key: "account", type: "object", label: "Created account" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const body = compact({
      name: input.name,
      currency: input.currency,
      billToContact: compact({
        firstName: input.billToFirstName,
        lastName: input.billToLastName,
        workEmail: input.billToWorkEmail,
        country: input.billToCountry,
      }),
      accountNumber: input.accountNumber,
      crmId: input.crmId,
      batch: input.batch,
      autoPay: input.autoPay,
      paymentTerm: input.paymentTerm,
      billCycleDay: input.billCycleDay,
      notes: input.notes,
    });

    const headers: Record<string, string> = {};
    if (ctx.invocation?.invocationId) headers["idempotency-key"] = ctx.invocation.invocationId;

    const account = await client.request("/v1/accounts", { method: "POST", headers, body });
    return { account };
  },
};

export default action;
