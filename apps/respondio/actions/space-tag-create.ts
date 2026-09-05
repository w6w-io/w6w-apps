import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";

/**
 * `POST /space/tag` — `SpaceClient.createTag` in the official SDK. Note the
 * API has no `GET /space/tag` list endpoint (confirmed absent from the
 * official SDK's `SpaceClient`, which exposes only create/update/delete) —
 * see `README.md`.
 */
interface Input {
  name: string;
  description?: string;
  colorCode?: string;
  emoji?: string;
}

const spaceTagCreate: ActionDefinition<Input> = {
  key: "space-tag-create",
  type: "perform",
  resource: "space",
  title: "Create Workspace Tag",
  description: "Create a workspace-level tag.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "string" },
    { key: "colorCode", label: "Color", type: "string", hint: 'Hex, e.g. "#FF5733".' },
    { key: "emoji", label: "Emoji", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "emoji", type: "string", label: "Emoji" },
    { key: "colorCode", type: "string", label: "Color" },
  ],

  execute(input, ctx) {
    if (!input.name) throw new Error("Name is required");
    return new RespondioClient(ctx).post(
      "/space/tag",
      compact({
        name: input.name,
        description: input.description,
        colorCode: input.colorCode,
        emoji: input.emoji,
      }),
    );
  },
};

export default spaceTagCreate;
