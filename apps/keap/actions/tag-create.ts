import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V2 } from "../lib/client.ts";

/**
 * `POST /rest/v2/tags` — Create Tag.
 *
 * The category is a nested reference (`{"category": {"id": "..."}}`), not a
 * flat `category_id`, because `CategoryReference` requires `id`. Sending a bare
 * `category_id` is silently ignored — the tag is created uncategorised.
 *
 * Keap truncates rather than rejects: "Name of the tag, up to 255 characters
 * will be saved".
 */
interface Input {
  name: string;
  description?: string;
  categoryId?: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  title: "Create Tag",
  resource: "tag",
  description: "Create a tag, optionally inside a tag category.",
  // Keap creates a new tag on every call rather than returning the existing one
  // by name, so a retry after a dropped connection makes a duplicate.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Only the first 255 characters are saved; Keap truncates rather than erroring.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      hint: "From List Tag Categories. Leave empty for an uncategorised tag.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "create_time", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      description: input.description,
      // A nested reference, not a flat id — see the module doc.
      category: input.categoryId ? { id: input.categoryId } : undefined,
    });
    const client = new KeapClient(ctx);
    return client.json(`${V2}/tags`, { method: "POST", body });
  },
};

export default tagCreate;
