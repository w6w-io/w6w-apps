import type { ActionDefinition } from "@w6w/types";
import { FeedlyClient } from "../lib/client.ts";

/**
 * `PUT /v3/tags/{streamId}` — add an article to a team board.
 *
 * Verified against the "Add articles to board" reference page (fetched
 * 2026-09-06): `servers: ["https://api.feedly.com/v3/tags/"]`, path
 * `/{streamId}` (PUT), body `{"entryId": "..."}`. `streamId` is a board's
 * stream id (`enterprise/<team>/tag/<uuid>`, from `boards-list`).
 *
 * Marked idempotent: PUT-ing the same entry onto the same board twice is a
 * no-op (a board holds each entry once), matching the vendor's own choice of
 * verb.
 */

interface Input {
  streamId: string;
  entryId: string;
}

const boardArticleAdd: ActionDefinition<Input> = {
  key: "board-article-add",
  type: "perform",
  resource: "boards",
  title: "Add Article to Board",
  description: "Add an article to a team board.",
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
    await new FeedlyClient(ctx).json(`/v3/tags/${encodeURIComponent(input.streamId)}`, {
      method: "PUT",
      body: { entryId: input.entryId },
    });
    return {};
  },
};

export default boardArticleAdd;
