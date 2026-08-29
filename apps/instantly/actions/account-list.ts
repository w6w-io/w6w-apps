import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, type InstantlyListPage } from "../lib/client.ts";
import { accountStatusOptions, providerCodeOptions } from "../lib/params.ts";

/**
 * `GET /api/v2/accounts` — list the workspace's connected sending accounts.
 *
 * `starting_after` here is a compound `timestamp_created&email` cursor per
 * the vendor's own doc (a legacy ISO-timestamp-only cursor also still works)
 * — always round-trip the `next_starting_after` value verbatim rather than
 * building one by hand.
 */
interface Input {
  search?: string;
  status?: number;
  provider_code?: number;
  tag_ids?: string;
  limit?: number;
  starting_after?: string;
}

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Sending Accounts",
  description: "List the workspace's connected email sending accounts.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "e.g. a domain like gmail.com." },
    { key: "status", label: "Status", type: "select", options: accountStatusOptions },
    { key: "provider_code", label: "Provider", type: "select", options: providerCodeOptions },
    {
      key: "tag_ids",
      label: "Tag IDs",
      type: "string",
      hint: "Comma-separated. Returns accounts with ANY of these tags.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "starting_after",
      label: "Starting after (cursor)",
      type: "string",
      hint: "Paste the previous response's `next_starting_after` verbatim.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Sending accounts" },
    { key: "next_starting_after", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json<InstantlyListPage<unknown>>("/accounts", {
      query: {
        search: input.search,
        status: input.status,
        provider_code: input.provider_code,
        tag_ids: input.tag_ids,
        limit: input.limit,
        starting_after: input.starting_after,
      },
    });
  },
};

export default accountList;
