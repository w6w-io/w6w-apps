import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  name: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a Tag resource.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 64 } },
  ],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post("/api/tags", { name: input.name });
  },
};

export default tagCreate;
