import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";
import { cursorParams } from "../lib/params.ts";

/**
 * `GET /v0/documents` — page through the community's document wiki index.
 *
 * Takes the same `startingAfter`/`limit` cursor pair as
 * `list-chat-channel-messages`, but answers a **bare array with no `hasMore`
 * flag** — Heartbeat's OpenAPI document confirms this (`{"type": "array",
 * "items": {"$ref": ".../DocumentList"}}`, no wrapper). There is no reliable
 * signal for "is there another page?" beyond "did this page come back
 * shorter than the limit I asked for?", which is wrong the one time the
 * remaining count exactly equals the limit. See `lib/client.ts` finding 1.
 */
interface Input {
  startingAfter?: string;
  limit?: number;
}

const listDocuments: ActionDefinition<Input> = {
  key: "list-documents",
  type: "search",
  resource: "document",
  title: "List Documents",
  description:
    "Page through the document wiki index. Heartbeat gives no `hasMore` signal here — a page " +
    "shorter than the requested Limit is the only reliable end-of-list indicator.",
  params: [...cursorParams()],
  output: [
    { key: "documents", type: "array", label: "Documents in this page — [{id, name, link}]" },
  ],

  async execute(input, ctx) {
    const documents = await new HeartbeatClient(ctx).json("/documents", {
      query: { startingAfter: input.startingAfter, limit: input.limit },
    });
    return { documents };
  },
};

export default listDocuments;
