import type { ActionDefinition } from "@w6w/types";
import { AweberClient, type AweberCollection } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /accounts` — every AWeber customer account this connection can reach.
 *
 * In practice a developer integration's connection has exactly one entry
 * here — AWeber's own onboarding guide uses this call purely to read off
 * `entries[0].id`, the account id every other call needs. It stays a "list"
 * action rather than a hard-coded single-account read because AWeber's docs
 * describe the collection as paginated, and a connection authorized on
 * behalf of an agency could plausibly see more than one.
 */
interface Input {
  start?: number;
  size?: number;
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description: "List the AWeber customer accounts this connection can access.",
  params: paginationParams(),
  output: [
    { key: "entries", type: "array", label: "Accounts" },
    { key: "total_size", type: "number", label: "Total accounts" },
  ],

  execute(input, ctx) {
    return new AweberClient(ctx).list<Record<string, unknown>>(
      "/accounts",
      paginationQuery(input),
    ) as Promise<AweberCollection<Record<string, unknown>>>;
  },
};

export default accountList;
