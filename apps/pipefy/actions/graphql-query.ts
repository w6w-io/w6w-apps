import type { ActionDefinition } from "@w6w/types";
import { jsonArg, PipefyClient } from "../lib/client.ts";

interface Input {
  query: string;
  variables?: unknown;
}

/**
 * The escape hatch.
 *
 * The named actions in this app cover the spine most Pipefy workflows
 * need — organizations, pipes, phases, cards and Database Tables — but
 * that's a fraction of Pipefy's schema: labels, pipe/table members, pipe
 * relations, automations, AI Agents, reports, and organization/pipe/table
 * webhooks are all reachable and none of them are modelled here (nor are
 * phase-field/table-field definition CRUD — see the README). This action
 * can also run `{ __typename }`-style probes to help find what a name
 * actually is, since unauthenticated introspection is refused.
 *
 * It carries the same guarantees as every other action and no fewer:
 *
 *   - it goes through `ctx.fetch`, so the egress allowlist applies;
 *   - it never sees the credential — the runtime's `sign` hook attaches it;
 *   - HTTP 200 with `errors[]` still throws;
 *   - the OAuth2-flavored bearer-rejection envelope (no `data`/`errors` at
 *     all) still throws too.
 *
 * Unlike every named action here, this one supports genuine `$variables` —
 * write your own query and declare your own variable types (Pipefy's
 * endpoint accepts them exactly like any GraphQL server); the named
 * actions inline arguments as literals instead only because they can't
 * discover a mutation's exact input TYPE NAME without introspection (see
 * `lib/client.ts`'s `gqlLiteral` comment) — that constraint doesn't apply
 * to scalar-typed variables you declare yourself.
 *
 * A mutation written here that returns a bare `success` boolean (every
 * delete mutation, plus `moveCardToPhase`'s field) must be checked by the
 * workflow itself — this action does not inspect the payload for one.
 */
const graphqlQuery: ActionDefinition<Input> = {
  key: "graphql-query",
  type: "perform",
  resource: "raw",
  title: "Run GraphQL Query",
  description: "Send an arbitrary query or mutation to Pipefy's GraphQL API. Returns `data`.",
  idempotent: false,
  params: [
    {
      key: "query",
      label: "Query or mutation",
      type: "code",
      ui: "code:graphql",
      required: true,
      placeholder: "query ($id: ID!) { pipe(id: $id) { name cards_count } }",
    },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      hint: "A JSON object matching the query's own variable definitions.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The GraphQL data payload" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send(
      input.query,
      jsonArg(input.variables, "variables"),
    );
    return { data };
  },
};

export default graphqlQuery;
