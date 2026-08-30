import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArrayArg, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  externalId: string;
  date: string;
  description: string;
  anchorAccountId: string;
  anchorAmount: number;
  anchorDirection: "DEPOSIT" | "WITHDRAWAL";
  categoryAccountId?: string;
  categoryAmount?: number;
  categoryBalance?: "INCREASE" | "DECREASE";
  lineItems?: unknown;
  notes?: string;
}

/**
 * Records a standard Wave transaction: a deposit/withdrawal on an "anchor"
 * account (a bank, credit card, or similar real-world account) categorized
 * against one or more accounting accounts. Confirmed against Wave's own
 * "Mutation: Create Money Transaction" doc, including the semantics it
 * spells out explicitly and that this action does NOT re-derive:
 *
 *   - The anchor's `direction` (`DEPOSIT`/`WITHDRAWAL`) and each line item's
 *     `balance` (`INCREASE`/`DECREASE`) already abstract Wave's underlying
 *     debit/credit accounting, so `INCREASE`/`DECREASE` mean different things
 *     on different account types (e.g. an INCOME-subtype line item's
 *     `INCREASE` is a credit) — see the README.
 *   - "The total of the line items must balance the deposit/withdrawal to the
 *     Anchor account" — Wave enforces this and rejects an unbalanced
 *     transaction via `inputErrors`, so this action does not pre-validate it.
 *   - Anchor accounts are Cash & Bank assets or Credit Card / Loans &
 *     Line-of-Credit liabilities; line items should reference OTHER accounts
 *     (sales, expenses) — Wave's docs explicitly warn against using an
 *     anchor-type account as a line item, since transfers between bank/credit
 *     accounts are "not yet available via the API".
 *
 * There is no `transaction:read` OAuth scope — Wave documents write-only
 * access here, so this app cannot offer a matching list/get action.
 */
const MUTATION = `
  mutation CreateMoneyTransaction($input: MoneyTransactionCreateInput!) {
    moneyTransactionCreate(input: $input) {
      didSucceed
      inputErrors { code message path }
      transaction { id }
    }
  }
`;

const moneyTransactionCreate: ActionDefinition<Input> = {
  key: "money-transaction-create",
  type: "perform",
  resource: "transaction",
  title: "Create Money Transaction",
  description:
    "Record a deposit or withdrawal on a bank/credit-card account, categorized against one or more accounting accounts. The line-item total must balance the anchor amount.",
  idempotent: false,
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    {
      key: "externalId",
      label: "External reference ID",
      type: "string",
      required: true,
      hint: "Your own idempotency/reference key for this transaction.",
    },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "description", label: "Description", type: "string", required: true },
    {
      key: "anchorAccountId",
      label: "Anchor account ID",
      type: "string",
      required: true,
      hint: "The bank, credit card, or loan account the money moved into/out of.",
      row: "anchor",
    },
    { key: "anchorAmount", label: "Anchor amount", type: "number", required: true, row: "anchor" },
    {
      key: "anchorDirection",
      label: "Anchor direction",
      type: "select",
      required: true,
      options: [
        { value: "DEPOSIT", label: "Deposit (money in)" },
        { value: "WITHDRAWAL", label: "Withdrawal (money out)" },
      ],
      row: "anchor",
    },
    {
      key: "categoryAccountId",
      label: "Category account ID",
      type: "string",
      hint:
        "Single-line convenience — the sales/expense account this transaction is categorized to. Ignored if `Line items` is set.",
      row: "category",
    },
    { key: "categoryAmount", label: "Category amount", type: "number", row: "category" },
    {
      key: "categoryBalance",
      label: "Category balance direction",
      type: "select",
      options: [
        { value: "INCREASE", label: "Increase" },
        { value: "DECREASE", label: "Decrease" },
      ],
      row: "category",
    },
    {
      key: "lineItems",
      label: "Line items (JSON)",
      type: "json",
      hint:
        'Overrides the single-category fields above. Array of `{ accountId, amount, balance: "INCREASE"|"DECREASE"|"DEBIT"|"CREDIT", description? }`.',
      advanced: true,
    },
    { key: "notes", label: "Notes", type: "text", advanced: true },
  ],
  output: [{ key: "transaction", type: "object", label: "The created transaction (id only)" }],

  async execute(input, ctx) {
    const parsedLineItems = jsonArrayArg(input.lineItems, "lineItems");
    const lineItems = parsedLineItems ? parsedLineItems : input.categoryAccountId
      ? [compact({
        accountId: input.categoryAccountId,
        amount: input.categoryAmount,
        balance: input.categoryBalance,
      })]
      : undefined;

    const data = await new WaveClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        businessId: input.businessId,
        externalId: input.externalId,
        date: input.date,
        description: input.description,
        notes: input.notes,
        anchor: compact({
          accountId: input.anchorAccountId,
          amount: input.anchorAmount,
          direction: input.anchorDirection,
        }),
        lineItems,
      }),
    });

    return unwrap(data, "moneyTransactionCreate");
  },
};

export default moneyTransactionCreate;
