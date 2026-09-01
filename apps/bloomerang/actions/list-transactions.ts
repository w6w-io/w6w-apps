import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, type BloomerangList, PAGE_OUTPUT, pageQuery } from "../lib/client.ts";

interface Input {
  accountId?: number;
  type?: "Donation" | "Pledge" | "PledgePayment" | "RecurringDonation" | "RecurringDonationPayment";
  minAmount?: number;
  maxAmount?: number;
  lastModified?: string;
  skip?: number;
  take?: number;
}

/**
 * `GET /transactions` — list transactions (donations, pledges, pledge
 * payments, recurring donation schedules and their payments).
 *
 * Params confirmed against the OpenAPI document: `accountId` and `type` filter
 * results (`type` "filters the results based on if the transaction has at
 * least one of the given designation types"), `minAmount`/`maxAmount` filter
 * inclusively on the transaction total, and `lastModified` filters to
 * transactions modified after the given timestamp — useful for an incremental
 * sync. Standard `skip`/`take` pagination applies.
 */
const listTransactions: ActionDefinition<Input> = {
  key: "list-transactions",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description:
    "List transactions, optionally filtered by constituent, designation type, amount range, or " +
    "last-modified date.",
  params: [
    {
      key: "accountId",
      label: "Constituent ID",
      type: "number",
      hint: "Filter to transactions belonging to this constituent (Bloomerang's `AccountId`).",
    },
    {
      key: "type",
      label: "Designation type",
      type: "select",
      options: [
        { value: "Donation", label: "Donation" },
        { value: "Pledge", label: "Pledge" },
        { value: "PledgePayment", label: "Pledge Payment" },
        { value: "RecurringDonation", label: "Recurring Donation" },
        { value: "RecurringDonationPayment", label: "Recurring Donation Payment" },
      ],
    },
    { key: "minAmount", label: "Min amount", type: "number" },
    { key: "maxAmount", label: "Max amount", type: "number" },
    {
      key: "lastModified",
      label: "Modified after",
      type: "datetime",
      hint: "Only return transactions last modified after this date/time.",
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      hint: "Number of records to skip before starting to collect the result set (`skip`).",
    },
    {
      key: "take",
      label: "Take",
      type: "number",
      hint: "Number of records to return (`take`). Bloomerang defaults to 50 and caps this at 50.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new BloomerangClient(ctx).request<BloomerangList>("/transactions", {
      query: {
        ...pageQuery(input),
        accountId: input.accountId,
        type: input.type,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount,
        lastModified: input.lastModified,
      },
    });
  },
};

export default listTransactions;
