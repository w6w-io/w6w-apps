import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";

/**
 * `PUT /space/tag` — `SpaceClient.updateTag` in the official SDK.
 * `UpdateSpaceTagRequest` addresses the tag to change by its CURRENT name
 * (`currentName`), not an id — there is no tag id in the update/delete
 * surface, only in what `createTag` returns.
 */
interface Input {
  currentName: string;
  name?: string;
  description?: string;
  colorCode?: string;
  emoji?: string;
}

const spaceTagUpdate: ActionDefinition<Input> = {
  key: "space-tag-update",
  type: "perform",
  resource: "space",
  title: "Update Workspace Tag",
  description: "Rename or restyle a workspace tag, addressed by its current name.",
  idempotent: true,
  params: [
    { key: "currentName", label: "Current name", type: "string", required: true },
    { key: "name", label: "New name", type: "string" },
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
    if (!input.currentName) throw new Error("Current name is required");
    return new RespondioClient(ctx).put(
      "/space/tag",
      compact({
        currentName: input.currentName,
        name: input.name,
        description: input.description,
        colorCode: input.colorCode,
        emoji: input.emoji,
      }),
    );
  },
};

export default spaceTagUpdate;
