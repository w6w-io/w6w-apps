import type { ActionDefinition } from "@w6w/types";
import { jsonArg, WaveClient } from "../lib/client.ts";

interface Input {
  query: string;
  variables?: unknown;
}

/**
 * The escape hatch.
 *
 * The twenty actions in this app cover the spine most Wave workflows need —
 * customers, products, the chart of accounts, invoices, estimates and money
 * transactions — but that's a fraction of Wave's schema: sales taxes, vendors,
 * invoice payments and reminders, estimate deposits and acceptance history,
 * recurring invoices, and constants (currencies, countries, account subtypes)
 * are all reachable and none of them are modelled here. See the README for
 * the specific list.
 *
 * It carries the same guarantees as every other action and no fewer:
 *
 *   - it goes through `ctx.fetch`, so the egress allowlist applies;
 *   - it never sees the credential — the runtime's `sign` hook attaches it;
 *   - HTTP 200 with `errors[]` still throws.
 *
 * What it does NOT do is check `inputErrors`. It cannot: `unwrap` needs to
 * know which field of `data` is the mutation payload, and only the caller
 * knows that. **A mutation written here must select `didSucceed` and
 * `inputErrors { path message code }` and the workflow must check them** —
 * otherwise a rejected write returns a perfectly successful-looking result
 * with a null record.
 *
 * One more thing worth restating from Wave's own "Variables" doc: any
 * argument of GraphQL type `String` must be passed as a variable, not inlined
 * into the query text — Wave's parser rejects an inlined string literal where
 * a variable is expected for several of its inputs. Using `$variables` for
 * everything (as the params below do) sidesteps this entirely.
 */
const graphqlQuery: ActionDefinition<Input> = {
  key: "graphql-query",
  type: "perform",
  resource: "raw",
  title: "Run GraphQL Query",
  description:
    "Send an arbitrary query or mutation to Wave's GraphQL API. Returns `data`. Mutations must select and check `didSucceed`/`inputErrors` themselves.",
  idempotent: false,
  params: [
    {
      key: "query",
      label: "Query or mutation",
      type: "code",
      ui: "code:graphql",
      required: true,
      placeholder:
        "query ($businessId: ID!) { business(id: $businessId) { customers(page: 1, pageSize: 10) { edges { node { id name } } } } }",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: "A JSON object matching the query's variable definitions.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The GraphQL data payload" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query(
      input.query,
      jsonArg(input.variables, "variables") ?? {},
    );
    return { data };
  },
};

export default graphqlQuery;
