import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  name: string;
}

/**
 * `POST /v2/social-sets/{social_set_id}/tags` — create a tag. `slug` is
 * auto-generated from `name` server-side.
 *
 * Not `idempotent`: the vendor documents no upsert-by-name behavior, and this
 * app has not observed what a duplicate name does — leaving it `false` is the
 * conservative reading rather than assuming a retry is free.
 */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag on a social set. The slug is generated from the name.",
  idempotent: false,
  params: [
    socialSetIdParam,
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 32 },
      hint: "Display name — the slug is generated from this automatically.",
    },
  ],
  output: [
    { key: "slug", type: "string", label: "Auto-generated slug — use this to tag drafts" },
    { key: "name", type: "string", label: "Display name" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/tags`, {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default tagCreate;
