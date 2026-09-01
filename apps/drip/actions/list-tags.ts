import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

const listTags: ActionDefinition<Record<string, never>> = {
  key: "list-tags",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List every tag used at least once in this account.",
  params: [],
  output: [{ key: "tags", type: "array", label: "Tags" }],

  async execute(_input, ctx) {
    const body = await new DripClient(ctx).request<{ tags?: string[] }>("/tags");
    return { tags: body.tags ?? [] };
  },
};

export default listTags;
