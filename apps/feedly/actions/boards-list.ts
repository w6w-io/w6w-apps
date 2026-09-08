import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `GET /v3/enterprise/tags` — list the enterprise team's boards.
 *
 * Verified against the "Get list of team board streamIds" reference page
 * (fetched 2026-09-06): `servers: ["https://api.feedly.com/v3/enterprise"]`,
 * path `/tags`. Despite the page's title ("streamIds"), the documented
 * response is the full board objects (`label`, `id`, `totalEntries`, member
 * `users`, …), not a bare list of ids — this action returns them as-is.
 */

const boardsList: ActionDefinition<Record<string, never>> = {
  key: "boards-list",
  type: "read",
  resource: "boards",
  title: "List Boards",
  description: "List the enterprise team's boards, including their stream ids and members.",
  params: [],
  output: [{ key: "boards", type: "array", label: "Boards" }],

  async execute(_input, ctx) {
    const boards = await new FeedlyClient(ctx).json<unknown[]>("/v3/enterprise/tags");
    return { boards: boards ?? [] };
  },
};

export default boardsList;
