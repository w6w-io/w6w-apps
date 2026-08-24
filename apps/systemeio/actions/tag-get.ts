import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Get Tag",
  description: "Retrieve a single Tag resource by id.",
  params: [
    { key: "id", label: "Tag ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get(`/api/tags/${encodeURIComponent(input.id)}`);
  },
};

export default tagGet;
