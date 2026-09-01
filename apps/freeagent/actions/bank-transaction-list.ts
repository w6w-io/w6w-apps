import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, ref } from "../lib/client.ts";
import { fromDate, page, perPage, toDate, updatedSince } from "../lib/params.ts";

interface Input {
  bankAccountId: string;
  view?: "all" | "unexplained" | "explained" | "manual" | "imported" | "marked_for_review";
  fromDate?: string;
  toDate?: string;
  updatedSince?: string;
  lastUploaded?: boolean;
  page?: number;
  perPage?: number;
}

const bankTransactionList: ActionDefinition<Input> = {
  key: "bank-transaction-list",
  type: "read",
  resource: "bank-transaction",
  title: "List Bank Transactions",
  description: "List bank transactions for a bank account.",
  params: [
    { key: "bankAccountId", label: "Bank Account ID", type: "string", required: true },
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      options: [
        { value: "all", label: "All (default)" },
        { value: "unexplained", label: "Unexplained" },
        { value: "explained", label: "Explained" },
        { value: "manual", label: "Manual" },
        { value: "imported", label: "Imported" },
        { value: "marked_for_review", label: "Marked for review" },
      ],
    },
    fromDate,
    toDate,
    updatedSince,
    {
      key: "lastUploaded",
      label: "Only last uploaded statement",
      type: "boolean",
      advanced: true,
    },
    page,
    perPage,
  ],
  output: [{ key: "bank_transactions", type: "array", label: "Bank transactions" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/bank_transactions", {
      query: {
        bank_account: ref("bank_accounts", input.bankAccountId),
        view: input.view,
        from_date: input.fromDate,
        to_date: input.toDate,
        updated_since: input.updatedSince,
        last_uploaded: input.lastUploaded,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default bankTransactionList;
