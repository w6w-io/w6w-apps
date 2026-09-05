import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /content_blocks/list` — verified against the fetched spec. `limit`/`offset` paged. */
const action: ActionDefinition = {
  key: "content-block-list",
  type: "read",
  resource: "content-block",
  title: "List Content Blocks",
  description: "List reusable Content Blocks in the workspace.",
  params: [
    { key: "modifiedAfter", label: "Modified After", type: "datetime" },
    { key: "modifiedBefore", label: "Modified Before", type: "datetime" },
    { key: "limit", label: "Limit", type: "number", default: 100, hint: "Max 1000." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "contentBlocks", type: "array", label: "Content Blocks" },
  ],

  async execute(input, ctx) {
    const p = input as {
      modifiedAfter?: string;
      modifiedBefore?: string;
      limit?: number;
      offset?: number;
    };
    return await new BrazeClient(ctx).get("/content_blocks/list", {
      modified_after: p.modifiedAfter || undefined,
      modified_before: p.modifiedBefore || undefined,
      limit: p.limit,
      offset: p.offset,
    });
  },
};

export default action;
