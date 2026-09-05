import type { ActionDefinition } from "@w6w/types";
import { compact, ZuoraClient } from "../lib/client.ts";

interface Input {
  accountKey: string;
  name?: string;
  crmId?: string;
  batch?: string;
  autoPay?: boolean;
  notes?: string;
  paymentTerm?: string;
  billCycleDay?: number;
  billToFirstName?: string;
  billToLastName?: string;
  billToWorkEmail?: string;
}

/**
 * `PUT /v1/accounts/{account-key}` — verified against
 * `developer.zuora.com/v1-api-reference/api/accounts/put_account`.
 *
 * Zuora only changes the fields present in the request body — an omitted
 * field is left alone, but a field sent as an EMPTY STRING is cleared. This
 * action only sends bill-to fields when at least one was provided, so a
 * caller updating just `notes` never accidentally blanks the bill-to contact.
 *
 * Deliberately does NOT set `Idempotency-Key`: Zuora's own header doc says
 * that header applies to POST and PATCH requests only ("Do not use this
 * header in other request types") — this is a PUT. See `lib/client.ts`'s
 * module doc.
 */
const action: ActionDefinition<Input> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: "Update a customer account. Only the fields provided are changed.",
  idempotent: true,
  params: [
    { key: "accountKey", label: "Account Key", type: "string", required: true },
    { key: "name", label: "Account Name", type: "string" },
    { key: "crmId", label: "CRM ID", type: "string" },
    { key: "batch", label: "Batch", type: "string" },
    { key: "autoPay", label: "Auto Pay", type: "boolean" },
    { key: "paymentTerm", label: "Payment Term", type: "string" },
    { key: "billCycleDay", label: "Bill Cycle Day", type: "number", advanced: true },
    { key: "billToFirstName", label: "Bill-To First Name", type: "string", advanced: true },
    { key: "billToLastName", label: "Bill-To Last Name", type: "string", advanced: true },
    { key: "billToWorkEmail", label: "Bill-To Work Email", type: "string", advanced: true },
    { key: "notes", label: "Notes", type: "text", advanced: true },
  ],
  output: [{ key: "account", type: "object", label: "Updated account" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const billToContact = compact({
      firstName: input.billToFirstName,
      lastName: input.billToLastName,
      workEmail: input.billToWorkEmail,
    });
    const body = compact({
      name: input.name,
      crmId: input.crmId,
      batch: input.batch,
      autoPay: input.autoPay,
      paymentTerm: input.paymentTerm,
      billCycleDay: input.billCycleDay,
      notes: input.notes,
      billToContact: Object.keys(billToContact).length > 0 ? billToContact : undefined,
    });

    const account = await client.request(
      `/v1/accounts/${encodeURIComponent(input.accountKey)}`,
      { method: "PUT", body },
    );
    return { account };
  },
};

export default action;
