import type { ActionDefinition } from "@w6w/types";
import { compact, RaindropClient } from "../lib/client.ts";
import { collectionViewOptions } from "../lib/params.ts";

/**
 * `POST /rest/v1/collection` — create a collection.
 *
 * **Singular path, again**: the plural `/collections` is the list/reorder route
 * and will not create anything.
 *
 * `parent.$id` is how nesting is expressed, and it is exposed here as a flat
 * `parentId` for the same reason as everywhere else in this app — a `$`-prefixed
 * key in a form invites a JSONPath reading it does not have.
 *
 * Not idempotent: Raindrop has no uniqueness constraint on a collection title
 * and accepts no idempotency key, so a retry produces a second collection with
 * the same name. The runtime must not retry this on a dropped connection.
 *
 * `public: true` makes the collection **and every bookmark in it** readable by
 * anyone with the link, without authentication. That is stated in the parameter
 * hint rather than buried, because it is a one-checkbox data exposure.
 */
interface Input {
  title: string;
  parentId?: number;
  view?: string;
  public?: boolean;
  sort?: number;
  cover?: string;
}

const collectionCreate: ActionDefinition<Input> = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create Collection",
  description: "Create a collection, optionally nested under an existing one.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "parentId",
      label: "Parent collection",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Leave empty for a root collection. Sent as `parent.$id`.",
    },
    {
      key: "view",
      label: "View",
      type: "select",
      options: collectionViewOptions,
      hint: "How the collection renders in the Raindrop app.",
    },
    {
      key: "public",
      label: "Public",
      type: "boolean",
      hint: "Makes the collection AND every bookmark in it readable by anyone with the link, " +
        "with no authentication.",
    },
    {
      key: "sort",
      label: "Sort position",
      type: "number",
      advanced: true,
      validation: { integer: true },
      hint: "Descending order among collections with the same parent.",
    },
    {
      key: "cover",
      label: "Cover URL",
      type: "string",
      advanced: true,
      hint: "A single cover image URL — e.g. one returned by Search Covers.",
    },
  ],
  output: [{ key: "item", type: "object", label: "Created collection" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = compact({
      title: input.title,
      view: input.view,
      sort: input.sort,
      // `cover` is an array in the API "due to legacy reasons" and always holds
      // exactly one item, so the form takes one URL and wraps it here.
      cover: input.cover ? [input.cover] : undefined,
    });
    if (typeof input.public === "boolean") body.public = input.public;
    if (typeof input.parentId === "number" && Number.isFinite(input.parentId)) {
      body.parent = { $id: input.parentId };
    }

    return { item: await new RaindropClient(ctx).item("/collection", { method: "POST", body }) };
  },
};

export default collectionCreate;
