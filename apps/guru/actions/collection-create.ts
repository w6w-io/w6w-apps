import type { ActionDefinition } from "@w6w/types";
import { compact, GuruClient, stripTokens } from "../lib/client.ts";

/**
 * `POST /api/v1/collections` — create a new Collection.
 *
 * Guru's OpenAPI document marks the whole request body optional and declares
 * no required fields on `CollectionModel`, but a Collection with no `name` is
 * not a usable one in Guru's own UI — `name` is required by this action even
 * though the wire schema would accept its absence.
 *
 * Requires a **User token**.
 */
interface Input {
  name: string;
  description?: string;
  color?: string;
}

const collectionCreate: ActionDefinition<Input> = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create Collection",
  description: "Create a new Collection.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "color", label: "Color", type: "string", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The created Collection" }],

  async execute(input, ctx) {
    const body = compact({ name: input.name, description: input.description, color: input.color });
    const collection = await new GuruClient(ctx).json<Record<string, unknown>>("/collections", {
      method: "POST",
      body,
    });
    return stripTokens(collection);
  },
};

export default collectionCreate;
