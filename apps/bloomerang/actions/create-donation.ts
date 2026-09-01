import type { ActionDefinition } from "@w6w/types";
import { BloomerangClient, compact } from "../lib/client.ts";

interface Input {
  accountId: number;
  date: string;
  amount: number;
  method?:
    | "None"
    | "Cash"
    | "Check"
    | "CreditCard"
    | "Eft"
    | "InKind"
    | "ApplePay"
    | "GooglePay"
    | "PayPal"
    | "Venmo";
  feeAmount?: number;
  fundId?: number;
  campaignId?: number;
  appealId?: number;
  note?: string;
}

/**
 * `POST /transaction` — record a Donation transaction with a single designation.
 *
 * Bloomerang's transaction model is more general than this action exposes:
 * a transaction (the payment total) is split into 1–20 "Designations", each
 * of which has its own `Type` — `Donation`, `Pledge`, `RecurringDonation`,
 * `RecurringDonationPayment` (each a fixed-literal discriminator confirmed in
 * the OpenAPI schema, e.g. a Donation designation carries `"Type": "Donation"`
 * plus fields like `NonDeductibleAmount` and `QuickbooksAccountId`). This
 * action covers the common single-designation Donation case — the shape
 * Bloomerang's own docs describe first ("Transactions represent the total
 * amount... always saved as at least one designation"). Split payments across
 * multiple designations, and the Pledge/RecurringDonation transaction types,
 * are out of scope here; use the Bloomerang UI or a direct API call for those.
 *
 * The designation's `Amount` is set equal to the transaction `Amount` — "the
 * total amount of the transaction... must equal the sum of its designations",
 * per the schema description, which a single designation trivially satisfies.
 *
 * **This app never touches payment data.** Bloomerang's own docs are explicit
 * that the private-key REST API is for server-to-server data sync only — "you
 * must process the donations and collect any funds yourself. Then you submit
 * the finished data to Bloomerang from your server." This action records that
 * a donation happened; it does not charge a card or move money.
 *
 * Not idempotent: Bloomerang mints a new transaction id per call with no
 * idempotency key on this endpoint, so a retry creates a duplicate record.
 */
const createDonation: ActionDefinition<Input> = {
  key: "create-donation",
  type: "perform",
  resource: "transaction",
  title: "Create Donation",
  description:
    "Record a Donation transaction against a constituent, with a single designation to one " +
    "fund. Does not process payment — for recording a donation already collected elsewhere.",
  idempotent: false,
  params: [
    {
      key: "accountId",
      label: "Constituent ID",
      type: "number",
      required: true,
      hint: "The constituent this donation is credited to (Bloomerang's `AccountId`).",
    },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
    {
      key: "method",
      label: "Payment method",
      type: "select",
      options: [
        { value: "None", label: "None" },
        { value: "Cash", label: "Cash" },
        { value: "Check", label: "Check" },
        { value: "CreditCard", label: "Credit Card" },
        { value: "Eft", label: "EFT" },
        { value: "InKind", label: "In Kind" },
        { value: "ApplePay", label: "Apple Pay" },
        { value: "GooglePay", label: "Google Pay" },
        { value: "PayPal", label: "PayPal" },
        { value: "Venmo", label: "Venmo" },
      ],
    },
    { key: "feeAmount", label: "Fee amount", type: "number" },
    {
      key: "fundId",
      label: "Fund ID",
      type: "number",
      hint: "The fund this donation is designated to. Discover ids with the List Funds action.",
    },
    { key: "campaignId", label: "Campaign ID", type: "number" },
    { key: "appealId", label: "Appeal ID", type: "number" },
    { key: "note", label: "Designation note", type: "text" },
  ],
  output: [
    { key: "Id", type: "number", label: "Transaction ID" },
    { key: "TransactionNumber", type: "number", label: "User-friendly transaction number" },
  ],

  execute(input, ctx) {
    const body = compact({
      AccountId: input.accountId,
      Date: input.date,
      Amount: input.amount,
      FeeAmount: input.feeAmount,
      Method: input.method,
      Designations: [
        compact({
          Type: "Donation",
          Amount: input.amount,
          FundId: input.fundId,
          CampaignId: input.campaignId,
          AppealId: input.appealId,
          Note: input.note,
        }),
      ],
    });
    return new BloomerangClient(ctx).request("/transaction", { method: "POST", body });
  },
};

export default createDonation;
