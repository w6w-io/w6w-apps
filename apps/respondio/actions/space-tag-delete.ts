import type { ActionDefinition } from "@w6w/types";
import { RespondioClient } from "../lib/client.ts";

/**
 * `DELETE /space/tag` — `SpaceClient.deleteTag` in the official SDK. Body
 * `{name}`, addressed by name (there is no tag id in this surface). Marked
 * idempotent: the end state (tag gone) is unchanged by a retry.
 */
interface Input {
  name: string;
}

const spaceTagDelete: ActionDefinition<Input> = {
  key: "space-tag-delete",
  type: "perform",
  resource: "space",
  title: "Delete Workspace Tag",
  description: "Delete a workspace tag by name.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "code", type: "number", label: "Result code" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    if (!input.name) throw new Error("Name is required");
    return new RespondioClient(ctx).delete("/space/tag", { name: input.name });
  },
};

export default spaceTagDelete;
