import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
  name: string;
}

/** `PUT /api/tags/{id}` — a full replace, `application/json` (unlike the merge-patch endpoints). */
const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Replace a Tag resource's name.",
  idempotent: true,
  params: [
    { key: "id", label: "Tag ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 64 } },
  ],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).put(`/api/tags/${encodeURIComponent(input.id)}`, {
      name: input.name,
    });
  },
};

export default tagUpdate;
