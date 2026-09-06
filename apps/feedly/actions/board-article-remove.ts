import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `DELETE /v3/tags/{streamId}/{entryId}` — remove an article from a team
 * board.
 *
 * Verified against the "Delete article from Board" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/tags/"]`, path
 * `/{streamId}/{entryId}`.
 *
 * Marked idempotent: removing an entry that is already off the board is the
 * same end state as removing it once, which is the ordinary REST reading of
 * `DELETE`.
 */

interface Input {
  streamId: string;
  entryId: string;
}

const boardArticleRemove: ActionDefinition<Input> = {
  key: "board-article-remove",
  type: "perform",
  resource: "boards",
  title: "Remove Article from Board",
  description: "Remove an article from a team board.",
  idempotent: true,
  params: [
    {
      key: "streamId",
      label: "Board Stream ID",
      type: "string",
      required: true,
      hint: "e.g. enterprise/acme/tag/<uuid>, from boards-list.",
    },
    { key: "entryId", label: "Entry ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new FeedlyClient(ctx).status(
      `/v3/tags/${encodeURIComponent(input.streamId)}/${encodeURIComponent(input.entryId)}`,
      { method: "DELETE" },
    );
    return {};
  },
};

export default boardArticleRemove;
