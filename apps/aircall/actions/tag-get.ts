import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { tagIdParam } from "../lib/params.ts";

interface Input {
  tagId: string;
}

/** `GET /v1/tags/:id` — one Tag. */
const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Retrieve Tag",
  description: "Fetch one call Tag by ID.",
  params: [tagIdParam],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name — unique within the company" },
    { key: "color", type: "string", label: "Hexadecimal colour" },
    { key: "description", type: "string", label: "Aircall-maintained qualifier" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(`/tags/${encodeId(input.tagId)}`, "tag");
  },
};

export default tagGet;
