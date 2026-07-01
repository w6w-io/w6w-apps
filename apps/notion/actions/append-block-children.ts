import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  blockId: string;
  children: unknown[];
  after?: string;
}

/**
 * Appends children blocks to any parent block (a page is also a block in
 * Notion's model). `children` is an array of Notion block objects and gets
 * passed straight through — the shape is documented at
 * https://developers.notion.com/reference/patch-block-children.
 */
const appendBlockChildren: ActionDefinition<Input> = {
  key: "append-block-children",
  type: "perform",
  resource: "block",
  title: "Append Block Children",
  description: "Append an array of blocks under a parent block or page.",
  params: [
    { key: "blockId", label: "Parent Block ID", type: "string", required: true },
    { key: "children", label: "Children (blocks)", type: "json", required: true },
    { key: "after", label: "Insert after block ID", type: "string" },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    const body: Record<string, unknown> = { children: input.children };
    if (input.after) body.after = input.after;
    return client.request(`/blocks/${input.blockId}/children`, {
      method: "PATCH",
      body,
    });
  },
};

export default appendBlockChildren;
