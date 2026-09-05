import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { type CollectionInput, collectionParams, collectionQuery } from "../lib/params.ts";

/**
 * `GET /1/Transactions` — a collection of transactions.
 *
 * Read-only: the Accessible Objects table grants only GET for Transaction
 * (46). Ontraport does document many transaction *lifecycle* endpoints
 * (`/transaction/refund`, `/transaction/void`, `/transaction/processManual`,
 * ...), left out of this app — see README.md.
 */
type Input = CollectionInput;

const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description: "Retrieve a collection of transactions, filtered, sorted and paginated.",
  params: collectionParams,
  output: [{ key: "items", type: "array", label: "Transactions" }],

  async execute(input, ctx) {
    const { items, count } = await new OntraportClient(ctx).list("/Transactions", {
      query: collectionQuery(input),
    });
    return { items, count };
  },
};

export default transactionList;
