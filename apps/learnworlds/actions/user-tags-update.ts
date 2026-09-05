import type { ActionDefinition } from "@w6w/types";
import { csv, LearnWorldsClient } from "../lib/client.ts";

/**
 * `PUT /v2/users/{id}/tags` — attach or detach tags on a user in one call.
 * Applying the same attach/detach twice leaves the same set of tags, so this
 * is idempotent.
 */
interface Input {
  id: string;
  tags: string;
  action: "attach" | "detach";
}

const userTagsUpdate: ActionDefinition<Input> = {
  key: "user-tags-update",
  type: "perform",
  resource: "user",
  title: "Attach or Detach User Tags",
  description: "Attach or detach one or more tags on a user.",
  idempotent: true,
  params: [
    { key: "id", label: "User ID or email", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      hint: "Comma-separated tag names.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      default: "attach",
      options: [
        { label: "Attach", value: "attach" },
        { label: "Detach", value: "detach" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const tags = csv(input.tags) ?? [];
    if (tags.length === 0) throw new Error("`tags` must include at least one tag");

    ctx.log("info", "updating LearnWorlds user tags", { id: input.id, action: input.action });

    return await new LearnWorldsClient(ctx).request(
      `/v2/users/${encodeURIComponent(input.id)}/tags`,
      { method: "PUT", body: { tags, action: input.action } },
    );
  },
};

export default userTagsUpdate;
