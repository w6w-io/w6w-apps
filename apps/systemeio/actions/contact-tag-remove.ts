import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: number;
  tagId: number;
}

/**
 * `DELETE /api/contacts/{id}/tags/{tagId}` — `204` on success.
 *
 * Both path params are typed `integer, minimum: 1` in the OpenAPI document for
 * THIS operation, unlike the plain `/api/contacts/{id}` and `/api/tags/{id}`
 * paths, which type `id` as an opaque string. Both are accepted as numbers
 * here, matching the schema for this specific endpoint.
 */
const contactTagRemove: ActionDefinition<Input> = {
  key: "contact-tag-remove",
  type: "perform",
  resource: "contact",
  title: "Remove Tag from Contact",
  description: "Remove a Tag from a Contact.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Contact ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/contacts/${input.id}/tags/${input.tagId}`,
    );
    return { status };
  },
};

export default contactTagRemove;
