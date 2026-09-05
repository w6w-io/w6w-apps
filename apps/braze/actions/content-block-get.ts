import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /content_blocks/info` — verified against the fetched spec. */
const action: ActionDefinition = {
  key: "content-block-get",
  type: "read",
  resource: "content-block",
  title: "Get Content Block",
  description: "Fetch a single Content Block's body and metadata.",
  params: [
    { key: "contentBlockId", label: "Content Block ID", type: "string", required: true },
    { key: "includeInclusionData", label: "Include Inclusion Data", type: "boolean" },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "content", type: "string", label: "Content" },
  ],

  async execute(input, ctx) {
    const p = input as { contentBlockId: string; includeInclusionData?: boolean };
    return await new BrazeClient(ctx).get("/content_blocks/info", {
      content_block_id: p.contentBlockId,
      include_inclusion_data: p.includeInclusionData,
    });
  },
};

export default action;
