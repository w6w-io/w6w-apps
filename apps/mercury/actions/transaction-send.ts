import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `POST /account/{accountId}/transactions` — "Send money to a recipient".
 * `operationId: createTransaction`.
 *
 * **This action moves real money.** The vendor's own description: "Creates a
 * transaction that will be processed immediately or MAY require approval" —
 * whether it clears instantly or lands in Mercury's own approval queue
 * depends on the connected organization's own approval policies, which this
 * app cannot see or configure. There is no dry-run flag in the OpenAPI
 * document.
 *
 * ## `idempotencyKey` is a REQUIRED request field — not a convenience
 *
 * Verified in the OpenAPI document's `requestBody.required`:
 * `["recipientId", "amount", "paymentMethod", "idempotencyKey"]`. Unlike a
 * vendor where idempotency is opt-in, Mercury will refuse a request missing
 * this field outright. `ctx.invocation.invocationId` is used directly — the
 * field is a plain `string` with no `format: "uuid"` constraint (unlike,
 * e.g., Wise's transfer-idempotency field elsewhere in this pack), so no
 * derivation step is needed. This makes the action safe to mark
 * `idempotent: true`: retrying the same invocation reuses the same key, and
 * Mercury's documented behavior for a repeated key is to return the original
 * transaction rather than create a second one.
 *
 * ## `purpose` is conditionally required
 *
 * Per the vendor: *"Required when paymentMethod is 'domesticWire'."* Left as
 * an optional param here (Mercury's own 400 for a missing purpose on a wire
 * names the field), rather than this action guessing a default purpose
 * category on the caller's behalf.
 */
interface Input {
  accountId: string;
  recipientId: string;
  amount: number;
  paymentMethod: "ach" | "check" | "domesticWire";
  purposeCategory?: string;
  purposeAdditionalInfo?: string;
  note?: string;
  externalMemo?: string;
}

const transactionSend: ActionDefinition<Input> = {
  key: "transaction-send",
  type: "perform",
  resource: "transaction",
  title: "Send Money to a Recipient",
  description:
    "Send money from a Mercury account to a saved recipient. May process immediately or require " +
    "approval, per the organization's own Mercury approval policies. Moves real funds.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "recipientId",
      label: "Recipient ID",
      type: "string",
      required: true,
      hint: "A recipient UUID from recipient-list or recipient-create.",
    },
    {
      key: "amount",
      label: "Amount (USD)",
      type: "number",
      required: true,
      validation: { min: 0.01 },
      hint: "Positive dollar amount, at least $0.01.",
    },
    {
      key: "paymentMethod",
      label: "Payment method",
      type: "select",
      required: true,
      options: [
        { value: "ach", label: "ACH" },
        { value: "check", label: "Check" },
        { value: "domesticWire", label: "Domestic wire" },
      ],
    },
    {
      key: "purposeCategory",
      label: "Purpose category",
      type: "select",
      hint: "Required by Mercury when Payment method is Domestic wire.",
      options: [
        { value: "employee", label: "Employee" },
        { value: "landlord", label: "Landlord" },
        { value: "vendor", label: "Vendor" },
        { value: "contractor", label: "Contractor" },
        { value: "subsidiary", label: "Subsidiary" },
        { value: "transferToMyExternalAccount", label: "Transfer to my external account" },
        { value: "familyMemberOrFriend", label: "Family member or friend" },
        { value: "forGoodsOrServices", label: "For goods or services" },
        { value: "angelInvestment", label: "Angel investment" },
        { value: "savingsOrInvestments", label: "Savings or investments" },
        { value: "expenses", label: "Expenses" },
        { value: "travel", label: "Travel" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "purposeAdditionalInfo",
      label: "Purpose additional info",
      type: "string",
      hint:
        "Required for Vendor/Contractor (name) and Other (description); optional for Subsidiary; not accepted for any other category.",
    },
    { key: "note", label: "Note", type: "text" },
    { key: "externalMemo", label: "External memo", type: "string" },
  ],
  output: [{ key: "transaction", type: "object", label: "Created transaction" }],

  async execute(input, ctx) {
    const purpose = input.purposeCategory
      ? {
        simple: {
          category: input.purposeCategory,
          ...(input.purposeAdditionalInfo ? { additionalInfo: input.purposeAdditionalInfo } : {}),
        },
      }
      : undefined;

    const transaction = await new MercuryClient(ctx).json(
      `/account/${encodeURIComponent(input.accountId)}/transactions`,
      {
        method: "POST",
        body: {
          recipientId: input.recipientId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          idempotencyKey: ctx.invocation?.invocationId ?? crypto.randomUUID(),
          ...(purpose ? { purpose } : {}),
          ...(input.note ? { note: input.note } : {}),
          ...(input.externalMemo ? { externalMemo: input.externalMemo } : {}),
        },
      },
    );
    return { transaction };
  },
};

export default transactionSend;
