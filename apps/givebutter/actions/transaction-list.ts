import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery, paymentMethodOptions } from "../lib/params.ts";

const sortOptions = [
  { value: "amount", label: "Amount" },
  { value: "transacted_at", label: "Transacted at" },
  { value: "created_at", label: "Created at" },
  { value: "contact_name", label: "Contact name" },
];

interface Input {
  transactedAfter?: string;
  transactedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  checkDepositedAfter?: string;
  checkDepositedBefore?: string;
  contacts?: string;
  method?: string;
  scope?: string;
  sortBy?: string;
  sortByDesc?: string;
  page?: number;
  per_page?: number;
}

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "read",
  resource: "transaction",
  title: "List Transactions",
  description: "List and filter transactions on the connected account.",
  params: [
    { key: "transactedAfter", label: "Transacted after", type: "datetime" },
    { key: "transactedBefore", label: "Transacted before", type: "datetime" },
    { key: "createdAfter", label: "Created after", type: "datetime" },
    { key: "createdBefore", label: "Created before", type: "datetime" },
    { key: "updatedAfter", label: "Updated after", type: "datetime" },
    { key: "updatedBefore", label: "Updated before", type: "datetime" },
    { key: "checkDepositedAfter", label: "Check deposited after", type: "datetime" },
    { key: "checkDepositedBefore", label: "Check deposited before", type: "datetime" },
    { key: "contacts", label: "Contact IDs", type: "string", hint: "Comma-separated contact ids." },
    { key: "method", label: "Payment method", type: "select", options: paymentMethodOptions },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "benefiting", label: "Benefiting" },
        { value: "chapters", label: "Chapters" },
      ],
    },
    { key: "sortBy", label: "Sort by", type: "select", options: sortOptions },
    { key: "sortByDesc", label: "Sort by (descending)", type: "select", options: sortOptions },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Transactions" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    const query = compact({
      transactedAfter: input.transactedAfter,
      transactedBefore: input.transactedBefore,
      createdAfter: input.createdAfter,
      createdBefore: input.createdBefore,
      updatedAfter: input.updatedAfter,
      updatedBefore: input.updatedBefore,
      checkDepositedAfter: input.checkDepositedAfter,
      checkDepositedBefore: input.checkDepositedBefore,
      contacts: input.contacts,
      method: input.method,
      scope: input.scope,
      sortBy: input.sortBy,
      sortByDesc: input.sortByDesc,
      ...paginationQuery(input),
    });
    return await new GivebutterClient(ctx).page("/transactions", { query }) as PageEnvelope<
      unknown
    >;
  },
};

export default transactionList;
