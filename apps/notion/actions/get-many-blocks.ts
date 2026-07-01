import type { ActionDefinition } from "@w6w/types";
import { NotionClient, type NotionListResponse } from "../lib/client.ts";

interface Input {
  blockId: string;
  pageSize?: number;
  startCursor?: string;
}

/**
 * Fetches the direct children of a block. Notion nests blocks arbitrarily
 * (toggle -> paragraph -> …), and the n8n node had a `fetchNestedBlocks`
 * expander. We keep the surface flat: return the direct children only and
 * let the caller drive their own recursion — cheaper by default, no hidden
 * fan-out cost.
 */
const getManyBlocks: ActionDefinition<Input, NotionListResponse> = {
  key: "get-many-blocks",
  type: "read",
  resource: "block",
  title: "Get Many Blocks",
  description: "List the direct children of a block (or a page). Returns one page — pass `startCursor` back to walk.",
  params: [
    { key: "blockId", label: "Parent Block ID", type: "string", required: true },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "startCursor", label: "Start cursor", type: "string" },
  ],
  output: [
    { key: "results", type: "array", label: "Blocks" },
    { key: "next_cursor", type: "string", label: "Next cursor" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request<NotionListResponse>(`/blocks/${input.blockId}/children`, {
      query: {
        page_size: input.pageSize ?? 100,
        start_cursor: input.startCursor,
      },
    });
  },
};

export default getManyBlocks;
